import { getEntry } from "astro:content";
import type { AboutPageEntry, HomePageEntry, LabPageEntry, NowPageEntry, PageEntry } from "../content-types";

type PageId = "home" | "about" | "lab" | "now";

const DEFAULT_API_BASE = "http://127.0.0.1:8000/api/";
const remotePageCache = new Map<PageId, Promise<Record<string, unknown> | undefined>>();

function getApiBase() {
  return process.env.A_BLOG_API_URL ?? process.env.PUBLIC_A_BLOG_API_URL ?? DEFAULT_API_BASE;
}

function buildApiUrl(path: string) {
  const base = getApiBase();
  return new URL(path.replace(/^\/+/, ""), base.endsWith("/") ? base : `${base}/`).toString();
}

async function fetchRemotePageData(id: PageId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(buildApiUrl(`pages/${id}/`), { signal: controller.signal });
    if (!response.ok) return undefined;
    const payload = await response.json();
    const data = payload?.data;
    if (!data || typeof data !== "object" || data.kind !== id) return undefined;
    return data as Record<string, unknown>;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

async function getRemotePageData(id: PageId) {
  const cached = remotePageCache.get(id);
  if (cached) return cached;
  const next = fetchRemotePageData(id);
  remotePageCache.set(id, next);
  return next;
}

async function requirePage(id: "home" | "about" | "lab" | "now") {
  const page = await getEntry("pages", id);

  if (!page) {
    throw new Error(`Missing page content entry: ${id}`);
  }

  return page;
}

async function getPage(id: PageId): Promise<PageEntry> {
  const localPage = (await requirePage(id)) as PageEntry;
  const remoteData = await getRemotePageData(id);
  return remoteData ? ({ ...localPage, data: remoteData } as PageEntry) : localPage;
}

export async function getHomePageData(): Promise<HomePageEntry> {
  const page = await getPage("home");
  if (page.data.kind !== "home") throw new Error("Page content mismatch for home");
  return page as HomePageEntry;
}

export async function getAboutPageData(): Promise<AboutPageEntry> {
  const page = await getPage("about");
  if (page.data.kind !== "about") throw new Error("Page content mismatch for about");
  return page as AboutPageEntry;
}

export async function getLabPageData(): Promise<LabPageEntry> {
  const page = await getPage("lab");
  if (page.data.kind !== "lab") throw new Error("Page content mismatch for lab");
  return page as LabPageEntry;
}

export async function getNowPageData(): Promise<NowPageEntry> {
  const page = await getPage("now");
  if (page.data.kind !== "now") throw new Error("Page content mismatch for now");
  return page as NowPageEntry;
}
