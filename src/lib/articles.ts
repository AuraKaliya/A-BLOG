import { constants } from "node:fs";
import { access, readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const defaultCover = "/resource/default/default_image.png";

interface ArticleIndex {
  slug?: string;
  title?: string;
  summary?: string;
  description?: string;
  pubDate?: string;
  updatedDate?: string;
  cover?: string;
  category?: string;
  tags?: string[];
  featured?: boolean;
  draft?: boolean;
  wordCount?: number;
}

export interface ResourceArticle {
  slug: string;
  title: string;
  summary: string;
  pubDate: Date;
  updatedDate?: Date;
  cover: string;
  category: string;
  tags: string[];
  featured: boolean;
  draft: boolean;
  wordCount: number;
  html: string;
  text: string;
}

function articleRoot() {
  return resolve(process.cwd(), "resource", "article");
}

async function pathExists(path: string) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function parseDate(value: string | undefined, field: string, slug: string) {
  if (!value) {
    throw new Error(`Article ${slug} is missing ${field}.`);
  }
  const date = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`Article ${slug} has an invalid ${field}: ${value}`);
  }
  return date;
}

function parseOptionalDate(value: string | undefined, slug: string) {
  if (!value) return undefined;
  return parseDate(value, "updatedDate", slug);
}

function isExternalRef(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.startsWith("#") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("mailto:") ||
    normalized.startsWith("tel:") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("javascript:")
  );
}

function normalizeRelativeAsset(value: string) {
  const [beforeHash, hash = ""] = value.trim().split("#", 2);
  const [pathname, query = ""] = beforeHash.split("?", 2);
  const parts = pathname
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .split("/")
    .filter((part) => part.length > 0 && part !== ".");
  if (parts.includes("..")) {
    throw new Error(`Article asset path cannot escape its folder: ${value}`);
  }
  return `${parts.join("/")}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

function articleAssetUrl(slug: string, value: string) {
  if (isExternalRef(value)) return value;
  return `/resource/article/${slug}/${normalizeRelativeAsset(value)}`;
}

function rewriteSrcset(slug: string, value: string) {
  return value
    .split(",")
    .map((candidate) => {
      const parts = candidate.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return "";
      parts[0] = articleAssetUrl(slug, parts[0]);
      return parts.join(" ");
    })
    .filter(Boolean)
    .join(", ");
}

function rewriteHtmlAssetUrls(slug: string, html: string) {
  const withSrcset = html.replace(/\bsrcset\s*=\s*(["'])(.*?)\1/gi, (_match, quote: string, value: string) => {
    return `srcset=${quote}${rewriteSrcset(slug, value)}${quote}`;
  });

  return withSrcset.replace(/\b(src|href|poster)\s*=\s*(["'])(.*?)\2/gi, (_match, attr: string, quote: string, value: string) => {
    return `${attr}=${quote}${articleAssetUrl(slug, value)}${quote}`;
  });
}

function textFromHtml(html: string) {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function countTextUnits(text: string) {
  const cjkChars = text.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const words = text.replace(/[\u4e00-\u9fff]/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return cjkChars + words;
}

async function readArticleDirectory(slug: string): Promise<ResourceArticle> {
  const directory = resolve(articleRoot(), slug);
  const indexPath = resolve(directory, "index.json");
  const htmlPath = resolve(directory, "index.html");
  const payload = JSON.parse(await readFile(indexPath, "utf-8")) as ArticleIndex;
  const title = payload.title?.trim();
  const summary = (payload.summary ?? payload.description)?.trim();
  if (!title) throw new Error(`Article ${slug} is missing title.`);
  if (!summary) throw new Error(`Article ${slug} is missing summary.`);
  if (payload.tags && !Array.isArray(payload.tags)) throw new Error(`Article ${slug} tags must be an array.`);

  const rawHtml = await readFile(htmlPath, "utf-8");
  const html = rewriteHtmlAssetUrls(slug, rawHtml);
  const text = textFromHtml(rawHtml);
  const wordCount = payload.wordCount ?? countTextUnits(text);
  const cover = payload.cover?.trim();

  return {
    slug: payload.slug?.trim() || slug,
    title,
    summary,
    pubDate: parseDate(payload.pubDate, "pubDate", slug),
    updatedDate: parseOptionalDate(payload.updatedDate, slug),
    cover: cover ? articleAssetUrl(slug, cover) : defaultCover,
    category: payload.category?.trim() ?? "",
    tags: (payload.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    featured: Boolean(payload.featured),
    draft: Boolean(payload.draft),
    wordCount,
    html,
    text,
  };
}

export function sortArticlesByDate(articles: ResourceArticle[]) {
  return articles.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());
}

export async function getAllResourceArticles({ includeDrafts = false } = {}) {
  const root = articleRoot();
  if (!(await pathExists(root))) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const articles = await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map((entry) => readArticleDirectory(entry.name)),
  );
  return sortArticlesByDate(includeDrafts ? articles : articles.filter((article) => !article.draft));
}

export async function getResourceArticleBySlug(slug: string) {
  const articles = await getAllResourceArticles();
  return articles.find((article) => article.slug === slug);
}

export async function getAllResourceArticleTags() {
  const articles = await getAllResourceArticles();
  const counts = new Map<string, number>();
  articles.forEach((article) => {
    article.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
  });
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

export function getAdjacentResourceArticles(articles: ResourceArticle[], slug: string) {
  const index = articles.findIndex((article) => article.slug === slug);
  return {
    previous: index >= 0 ? articles[index + 1] : undefined,
    next: index > 0 ? articles[index - 1] : undefined,
  };
}

export function formatWordCount(wordCount: number) {
  if (wordCount >= 10000) return `${(wordCount / 10000).toFixed(1)} 万字`;
  return `${wordCount.toLocaleString("zh-CN")} 字`;
}
