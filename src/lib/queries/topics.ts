import { getCollection } from "astro:content";
import { getPublishedPosts } from "./blog";
import { getPublishedWorks } from "./works";
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
  return sortTopicEntries(topics);
}

export async function getTopicDefinitionMap() {
  const topics = await getTopicDefinitions();
  return new Map(topics.map((topic) => [topic.id, topic]));
}

export async function getTopicSummaries(): Promise<TopicSummary[]> {
  await assertValidContentGraph();

  const [topics, posts, works] = await Promise.all([getTopicDefinitions(), getPublishedPosts(), getPublishedWorks()]);

  return topics.map((topic) => ({
    id: topic.id,
    title: topic.data.title,
    description: topic.data.description,
    accent: topic.data.accent,
    keywords: topic.data.keywords,
    posts: posts.filter((post) => post.data.topics.includes(topic.id)),
    works: works.filter((work) => work.data.topics.includes(topic.id)),
  }));
}
