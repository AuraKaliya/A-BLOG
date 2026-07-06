import { getCollection } from "astro:content";
import { withSlug } from "../content-entry";
import type { WorldEntry } from "../content-types";

export function sortWorldEntries(entries: WorldEntry[]) {
  return entries.sort((a, b) => {
    const featuredDelta = Number(b.data.featured) - Number(a.data.featured);
    if (featuredDelta !== 0) return featuredDelta;

    const orderDelta = a.data.sortOrder - b.data.sortOrder;
    if (orderDelta !== 0) return orderDelta;

    return b.data.updatedDate.valueOf() - a.data.updatedDate.valueOf();
  });
}

export async function getPublishedWorldEntries() {
  const entries = await getCollection("world", ({ data }) => !data.draft);
  return sortWorldEntries(entries.map(withSlug));
}

export async function getFeaturedWorldEntries(limit = 3) {
  const entries = await getPublishedWorldEntries();
  return entries.filter((entry) => entry.data.featured).slice(0, limit);
}

export async function getWorldEntriesByKind(kind: WorldEntry["data"]["kind"]) {
  const entries = await getPublishedWorldEntries();
  return entries.filter((entry) => entry.data.kind === kind);
}

export async function getWorldEntriesBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];

  const entries = await getPublishedWorldEntries();
  const entriesBySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const missing = slugs.filter((slug) => !entriesBySlug.has(slug));

  if (missing.length > 0) {
    throw new Error(`Missing related world entries: ${missing.join(", ")}`);
  }

  return slugs.map((slug) => entriesBySlug.get(slug)!);
}
