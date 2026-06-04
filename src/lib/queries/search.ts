import { blogCategoryLabels, workCategoryLabels } from "../../config/taxonomy";
import { assertValidContentGraph } from "../content-graph";
import type { SearchEntry } from "../content-types";
import { getPublishedPosts } from "./blog";
import { getTopicSummaries } from "./topics";
import { getPublishedWorks } from "./works";

export async function getSearchEntries(): Promise<SearchEntry[]> {
  await assertValidContentGraph();

  const [posts, works, topics] = await Promise.all([getPublishedPosts(), getPublishedWorks(), getTopicSummaries()]);

  return [
    ...posts.map((post) => ({
      type: "文章" as const,
      kind: "blog" as const,
      title: post.data.title,
      description: post.data.description,
      href: `/blog/${post.slug}`,
      category: blogCategoryLabels[post.data.category],
      tags: [...post.data.tags, ...post.data.topics],
      date: post.data.pubDate.toISOString(),
      weight: post.data.featured ? 4 : 3,
      text: `${post.data.title} ${post.data.description} ${blogCategoryLabels[post.data.category]} ${post.data.topics.join(" ")} ${post.data.tags.join(" ")} ${post.body}`,
    })),
    ...works.map((work) => ({
      type: "作品" as const,
      kind: "work" as const,
      title: work.data.title,
      description: work.data.description,
      href: `/works/${work.slug}`,
      category: workCategoryLabels[work.data.category],
      tags: [...work.data.techStack, ...work.data.topics],
      date: String(work.data.year),
      weight: work.data.featured ? 4 : 2,
      text: `${work.data.title} ${work.data.description} ${work.data.role} ${work.data.category} ${work.data.status} ${work.data.topics.join(" ")} ${work.data.techStack.join(" ")} ${work.body}`,
    })),
    ...topics.map((topic) => ({
      type: "主题" as const,
      kind: "topic" as const,
      title: topic.title,
      description: topic.description,
      href: `/topics#${topic.id}`,
      category: "主题地图",
      tags: topic.keywords,
      date: String(topic.posts.length + topic.works.length),
      weight: 1,
      text: `${topic.title} ${topic.description} ${topic.keywords.join(" ")}`,
    })),
  ];
}
