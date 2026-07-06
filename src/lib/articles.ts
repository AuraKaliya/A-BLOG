import { constants } from "node:fs";
import { access, readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseFragment, serialize, type DefaultTreeAdapterTypes } from "parse5";

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
  toc: ArticleTocItem[];
  text: string;
}

export interface ArticleTocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

interface RemoteArticlePayload {
  slug: string;
  title: string;
  summary: string;
  cover?: string;
  category?: string;
  tags?: string[];
  pubDate: string;
  updatedDate?: string | null;
  featured?: boolean;
  wordCount?: number;
  html?: string;
}

type HtmlNode = DefaultTreeAdapterTypes.Node;
type HtmlParentNode = DefaultTreeAdapterTypes.ParentNode;
type HtmlElement = DefaultTreeAdapterTypes.Element;
type HtmlTextNode = DefaultTreeAdapterTypes.TextNode;

const DEFAULT_API_BASE = "http://127.0.0.1:8000/api/";
const remoteArticleCache = new Map<string, Promise<ResourceArticle[] | undefined>>();
const allowedHtmlTags = new Set([
  "a",
  "abbr",
  "blockquote",
  "br",
  "code",
  "del",
  "div",
  "em",
  "figcaption",
  "figure",
  "h2",
  "h3",
  "h4",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "picture",
  "pre",
  "source",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);
const unsafeContentTags = new Set(["script", "style", "iframe", "object", "embed", "template", "form"]);
const globalHtmlAttributes = new Set(["class", "id"]);
const htmlAttributesByTag: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height", "loading"]),
  source: new Set(["src", "srcset", "media", "type", "sizes"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"]),
};
const urlAttributes = new Set(["href", "src", "poster"]);

function articleRoot() {
  return resolve(process.cwd(), "resource", "article");
}

function getApiBase() {
  return process.env.A_BLOG_API_URL ?? process.env.PUBLIC_A_BLOG_API_URL ?? DEFAULT_API_BASE;
}

function shouldBuildRemoteArticles() {
  return process.env.A_BLOG_BUILD_REMOTE_CONTENT === "1" || process.env.A_BLOG_BUILD_REMOTE_ARTICLES === "1";
}

function buildApiUrl(path: string) {
  const base = getApiBase();
  return new URL(path.replace(/^\/+/, ""), base.endsWith("/") ? base : `${base}/`).toString();
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return undefined;
    return await response.json();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
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
    normalized.startsWith("tel:")
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
  if (hasUnsafeScheme(value)) return "";
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

function hasChildNodes(node: HtmlNode): node is HtmlParentNode {
  return "childNodes" in node;
}

function isElement(node: HtmlNode): node is HtmlElement {
  return "tagName" in node;
}

function isTextNode(node: HtmlNode): node is HtmlTextNode {
  return node.nodeName === "#text";
}

function isTocHeading(node: HtmlNode): node is HtmlElement {
  return isElement(node) && (node.tagName === "h2" || node.tagName === "h3");
}

function getAttribute(node: HtmlElement, name: string) {
  return node.attrs.find((attribute) => attribute.name === name)?.value;
}

function setAttribute(node: HtmlElement, name: string, value: string) {
  const existing = node.attrs.find((attribute) => attribute.name === name);
  if (existing) {
    existing.value = value;
    return;
  }
  node.attrs.push({ name, value });
}

function hasAllowedAttribute(tagName: string, attributeName: string) {
  return globalHtmlAttributes.has(attributeName) || Boolean(htmlAttributesByTag[tagName]?.has(attributeName));
}

function hasUnsafeScheme(value: string) {
  const normalized = value.trim().replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
  if (!normalized || normalized.startsWith("/") || normalized.startsWith("#")) return false;
  if (normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("mailto:") || normalized.startsWith("tel:")) {
    return false;
  }
  return /^[a-z][a-z0-9+.-]*:/i.test(normalized);
}

function isSafeSrcset(value: string) {
  return value
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean)
    .every((url) => !hasUnsafeScheme(url));
}

function sanitizeElementAttributes(node: HtmlElement) {
  const tagName = node.tagName.toLowerCase();
  node.attrs = node.attrs.filter((attribute) => {
    const name = attribute.name.toLowerCase();
    if (name.startsWith("on") || !hasAllowedAttribute(tagName, name)) return false;
    if (name === "srcset") return isSafeSrcset(attribute.value);
    if (urlAttributes.has(name)) return !hasUnsafeScheme(attribute.value);
    return true;
  });
}

function sanitizeHtmlChildren(parent: HtmlParentNode) {
  const children = parent.childNodes as HtmlNode[];
  for (let index = 0; index < children.length; ) {
    const child = children[index];
    if (isElement(child)) {
      const tagName = child.tagName.toLowerCase();
      if (!allowedHtmlTags.has(tagName)) {
        if (unsafeContentTags.has(tagName) || !hasChildNodes(child)) {
          children.splice(index, 1);
          continue;
        }
        sanitizeHtmlChildren(child);
        const replacement = [...(child.childNodes as HtmlNode[])];
        children.splice(index, 1, ...replacement);
        index += replacement.length;
        continue;
      }
      sanitizeElementAttributes(child);
    }
    if (hasChildNodes(child)) sanitizeHtmlChildren(child);
    index += 1;
  }
}

function getNodeText(node: HtmlNode): string {
  if (isTextNode(node)) return node.value;
  if (!hasChildNodes(node)) return "";
  return node.childNodes.map((child) => getNodeText(child)).join("");
}

function slugifyHeading(text: string) {
  const slug = text
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

function uniqueHeadingId(base: string, usedIds: Set<string>) {
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

function collectNonHeadingIds(node: HtmlNode, usedIds: Set<string>) {
  if (isElement(node) && !isTocHeading(node)) {
    const id = getAttribute(node, "id")?.trim();
    if (id) usedIds.add(id);
  }

  if (hasChildNodes(node)) {
    node.childNodes.forEach((child) => collectNonHeadingIds(child, usedIds));
  }
}

function collectTocItems(node: HtmlNode, usedIds: Set<string>, toc: ArticleTocItem[]) {
  if (isTocHeading(node)) {
    const text = getNodeText(node).replace(/\s+/g, " ").trim();
    if (text) {
      const existingId = getAttribute(node, "id")?.trim();
      const id = existingId && !usedIds.has(existingId) ? existingId : uniqueHeadingId(slugifyHeading(text), usedIds);
      if (existingId && !usedIds.has(existingId)) usedIds.add(existingId);
      setAttribute(node, "id", id);
      toc.push({ id, text, depth: node.tagName === "h2" ? 2 : 3 });
    }
  }

  if (hasChildNodes(node)) {
    node.childNodes.forEach((child) => collectTocItems(child, usedIds, toc));
  }
}

function enhanceHtmlWithToc(html: string) {
  const fragment = parseFragment(html);
  sanitizeHtmlChildren(fragment);
  const usedIds = new Set<string>();
  const toc: ArticleTocItem[] = [];

  fragment.childNodes.forEach((node) => collectNonHeadingIds(node, usedIds));
  fragment.childNodes.forEach((node) => collectTocItems(node, usedIds, toc));

  return {
    html: serialize(fragment),
    toc,
  };
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
  const { html, toc } = enhanceHtmlWithToc(rewriteHtmlAssetUrls(slug, rawHtml));
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
    toc,
    text,
  };
}

export function sortArticlesByDate(articles: ResourceArticle[]) {
  return articles.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());
}

function parseRemoteDate(value: string | undefined | null, field: string, slug: string) {
  if (!value) throw new Error(`Remote article ${slug} is missing ${field}.`);
  const date = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`Remote article ${slug} has an invalid ${field}: ${value}`);
  }
  return date;
}

function parseOptionalRemoteDate(value: string | undefined | null, slug: string) {
  if (!value) return undefined;
  return parseRemoteDate(value, "updatedDate", slug);
}

function mapRemoteArticle(payload: RemoteArticlePayload): ResourceArticle {
  const slug = payload.slug?.trim();
  if (!slug) throw new Error("Remote article is missing slug.");
  const title = payload.title?.trim();
  const summary = payload.summary?.trim();
  if (!title) throw new Error(`Remote article ${slug} is missing title.`);
  if (!summary) throw new Error(`Remote article ${slug} is missing summary.`);

  const rawHtml = payload.html ?? "";
  const { html, toc } = enhanceHtmlWithToc(rawHtml);
  const text = textFromHtml(rawHtml);

  return {
    slug,
    title,
    summary,
    pubDate: parseRemoteDate(payload.pubDate, "pubDate", slug),
    updatedDate: parseOptionalRemoteDate(payload.updatedDate, slug),
    cover: payload.cover?.trim() || defaultCover,
    category: payload.category?.trim() ?? "",
    tags: (payload.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    featured: Boolean(payload.featured),
    draft: false,
    wordCount: payload.wordCount ?? countTextUnits(text),
    html,
    toc,
    text,
  };
}

async function fetchRemoteArticles() {
  const payload = await fetchJson(buildApiUrl("articles/"));
  const items = payload?.items;
  if (!Array.isArray(items)) return undefined;

  const details = await Promise.all(
    items.map(async (item: RemoteArticlePayload) => {
      const slug = item.slug?.trim();
      if (!slug) throw new Error("Remote article list item is missing slug.");
      const detail = await fetchJson(buildApiUrl(`articles/${encodeURIComponent(slug)}/`));
      if (!detail) throw new Error(`Remote article detail is unavailable: ${slug}`);
      return mapRemoteArticle(detail as RemoteArticlePayload);
    }),
  );

  return sortArticlesByDate(details);
}

async function getRemoteArticles() {
  const cacheKey = getApiBase();
  const cached = remoteArticleCache.get(cacheKey);
  if (cached) return cached;
  const next = fetchRemoteArticles().catch(() => undefined);
  remoteArticleCache.set(cacheKey, next);
  return next;
}

async function getLocalResourceArticles({ includeDrafts = false } = {}) {
  const root = articleRoot();
  if (!(await pathExists(root))) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const articles = await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map((entry) => readArticleDirectory(entry.name)),
  );
  return sortArticlesByDate(includeDrafts ? articles : articles.filter((article) => !article.draft));
}

export async function getAllResourceArticles({ includeDrafts = false } = {}) {
  if (!includeDrafts && shouldBuildRemoteArticles()) {
    const remoteArticles = await getRemoteArticles();
    if (remoteArticles) return remoteArticles;
  }
  return getLocalResourceArticles({ includeDrafts });
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
