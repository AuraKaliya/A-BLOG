import { getCollection } from "astro:content";
import { withSlug } from "../content-entry";
import type { LinkEntry } from "../content-types";

export function sortLinksByDate(links: LinkEntry[]) {
  return links.sort((a, b) => {
    const dateDelta = (b.data.updatedDate ?? b.data.addedDate).valueOf() - (a.data.updatedDate ?? a.data.addedDate).valueOf();
    if (dateDelta !== 0) return dateDelta;
    return a.data.title.localeCompare(b.data.title, "zh-CN");
  });
}

export async function getPublishedLinks() {
  const links = await getCollection("links", ({ data }) => !data.draft);
  return sortLinksByDate(links.map(withSlug));
}

export async function getFeaturedLinks(limit = 4) {
  const links = await getPublishedLinks();
  return links.filter((link) => link.data.featured).concat(links.filter((link) => !link.data.featured)).slice(0, limit);
}
