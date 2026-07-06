import { getCollection } from "astro:content";
import { withSlug } from "../content-entry";
import type { WorkEntry } from "../content-types";

export function sortWorks(works: WorkEntry[]) {
  return works.sort((a, b) => {
    const featuredDelta = Number(b.data.featured) - Number(a.data.featured);
    if (featuredDelta !== 0) return featuredDelta;

    const priorityDelta = b.data.priority - a.data.priority;
    if (priorityDelta !== 0) return priorityDelta;

    return b.data.year - a.data.year;
  });
}

export async function getPublishedWorks() {
  const works = await getCollection("works", ({ data }) => !data.draft);
  return sortWorks(works.map(withSlug));
}

export async function getFeaturedWorks(limit = 4) {
  const works = await getPublishedWorks();
  return works.filter((work) => work.data.featured).slice(0, limit);
}

export async function getAllWorkCategories() {
  const works = await getPublishedWorks();
  return [...new Set(works.map((work) => work.data.category))].sort();
}

export async function getWorksByCategory(category: WorkEntry["data"]["category"]) {
  const works = await getPublishedWorks();
  return works.filter((work) => work.data.category === category);
}

export async function getWorksByTopic(topicId: string) {
  const works = await getPublishedWorks();
  return works.filter((work) => work.data.topics.includes(topicId));
}

export async function getWorksBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];

  const works = await getPublishedWorks();
  const worksBySlug = new Map(works.map((work) => [work.slug, work]));
  const missing = slugs.filter((slug) => !worksBySlug.has(slug));

  if (missing.length > 0) {
    throw new Error(`Missing related works: ${missing.join(", ")}`);
  }

  return slugs.map((slug) => worksBySlug.get(slug)!);
}

export async function getLabWorks() {
  const works = await getPublishedWorks();
  return works.filter((work) => work.data.category === "experiment" || work.data.status === "concept");
}
