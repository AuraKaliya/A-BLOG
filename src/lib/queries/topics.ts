import { getCollection } from "astro:content";
import { getPublishedPosts } from "./blog";
import { getPublishedWorks } from "./works";
import { getPublishedWorldEntries } from "./world";
import { getPublishedNotes } from "./notes";
import { getPublishedLinks } from "./links";
import { contentSlug } from "../content-entry";
import type { TopicEntry, TopicSummary } from "../content-types";
import { assertValidContentGraph } from "../content-graph";

export function sortTopicEntries(topics: TopicEntry[]) {
  return topics.sort((a, b) => {
    const orderDelta = a.data.order - b.data.order;
    if (orderDelta !== 0) return orderDelta;
    return a.data.title.localeCompare(b.data.title, "zh-CN");
  });
}

export async function getTopicDefinitions() {
  const topics = await getCollection("topics");
  return sortTopicEntries(topics.map((topic) => Object.assign(topic, { id: contentSlug(topic.id) })));
}

export async function getTopicDefinitionMap() {
  const topics = await getTopicDefinitions();
  return new Map(topics.map((topic) => [topic.id, topic]));
}

export async function getTopicSummaries(): Promise<TopicSummary[]> {
  await assertValidContentGraph();

  const [topics, posts, works, worlds, notes, links] = await Promise.all([
    getTopicDefinitions(),
    getPublishedPosts(),
    getPublishedWorks(),
    getPublishedWorldEntries(),
    getPublishedNotes(),
    getPublishedLinks(),
  ]);

  return topics.map((topic) => ({
    id: topic.id,
    title: topic.data.title,
    description: topic.data.description,
    accent: topic.data.accent,
    keywords: topic.data.keywords,
    posts: posts.filter((post) => post.data.topics.includes(topic.id)),
    works: works.filter((work) => work.data.topics.includes(topic.id)),
    worlds: worlds.filter((entry) => entry.data.topics.includes(topic.id)),
    notes: notes.filter((note) => note.data.topics.includes(topic.id)),
    links: links.filter((link) => link.data.topics.includes(topic.id)),
  }));
}
