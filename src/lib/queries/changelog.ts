import { getCollection } from "astro:content";
import { hasCollectionSource, withSlug } from "../content-entry";
import type { ChangelogEntry } from "../content-types";

export function sortChangelogEntries(entries: ChangelogEntry[]) {
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getPublishedChangelogEntries() {
  if (!hasCollectionSource("changelog", [".md", ".mdx"])) return [];
  const entries = await getCollection("changelog", ({ data }) => !data.draft);
  return sortChangelogEntries(entries.map(withSlug));
}
