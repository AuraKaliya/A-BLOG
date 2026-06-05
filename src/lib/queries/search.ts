import { blogCategoryLabels, blogSectionLabels, changelogTypeLabels, linkKindLabels, noteKindLabels, workCategoryLabels, worldKindLabels } from "../../config/taxonomy";
import { assertValidContentGraph } from "../content-graph";
import type { SearchEntry } from "../content-types";
import { getPublishedPosts } from "./blog";
import { getTopicSummaries } from "./topics";
import { getPublishedWorks } from "./works";
import { getPublishedWorldEntries } from "./world";
import { getPublishedChangelogEntries } from "./changelog";
import { getPublishedNotes } from "./notes";
import { getPublishedLinks } from "./links";

export async function getSearchEntries(): Promise<SearchEntry[]> {
  await assertValidContentGraph();

  const [posts, works, worlds, notes, links, changelogEntries, topics] = await Promise.all([
    getPublishedPosts(),
    getPublishedWorks(),
    getPublishedWorldEntries(),
    getPublishedNotes(),
    getPublishedLinks(),
    getPublishedChangelogEntries(),
    getTopicSummaries(),
  ]);

  return [
    ...posts.map((post) => ({
      type: "文章" as const,
      kind: "blog" as const,
      title: post.data.title,
      description: post.data.description,
      href: `/blog/${post.slug}`,
      category: `${blogSectionLabels[post.data.section]} / ${blogCategoryLabels[post.data.category]}`,
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
    ...worlds.map((entry) => ({
      type: "世界条目" as const,
      kind: "world" as const,
      title: entry.data.title,
      description: entry.data.description,
      href: `/world/${entry.slug}`,
      category: worldKindLabels[entry.data.kind],
      tags: [...entry.data.tags, ...entry.data.topics],
      date: entry.data.updatedDate.toISOString(),
      weight: entry.data.featured ? 4 : 2,
      text: `${entry.data.title} ${entry.data.description} ${worldKindLabels[entry.data.kind]} ${entry.data.status} ${entry.data.era ?? ""} ${entry.data.eventDate ?? ""} ${entry.data.topics.join(" ")} ${entry.data.tags.join(" ")} ${entry.body}`,
    })),
    ...notes.map((note) => ({
      type: "短动态" as const,
      kind: "note" as const,
      title: note.data.title,
      description: note.data.description,
      href: `/notes/${note.slug}`,
      category: noteKindLabels[note.data.kind],
      tags: [...note.data.tags, ...note.data.topics],
      date: note.data.pubDate.toISOString(),
      weight: note.data.featured ? 3 : 2,
      text: `${note.data.title} ${note.data.description} ${noteKindLabels[note.data.kind]} ${note.data.mood ?? ""} ${note.data.topics.join(" ")} ${note.data.tags.join(" ")} ${note.body}`,
    })),
    ...links.map((link) => ({
      type: "推荐链接" as const,
      kind: "link" as const,
      title: link.data.title,
      description: link.data.description,
      href: `/links#${link.slug}`,
      category: linkKindLabels[link.data.kind],
      tags: [...link.data.tags, ...link.data.topics],
      date: link.data.addedDate.toISOString(),
      weight: link.data.featured ? 3 : 2,
      text: `${link.data.title} ${link.data.description} ${link.data.note} ${linkKindLabels[link.data.kind]} ${link.data.language} ${link.data.topics.join(" ")} ${link.data.tags.join(" ")} ${link.body}`,
    })),
    ...changelogEntries.map((entry) => ({
      type: "更新记录" as const,
      kind: "changelog" as const,
      title: entry.data.version,
      description: entry.data.summary,
      href: `/changelog#${entry.slug}`,
      category: changelogTypeLabels[entry.data.type],
      tags: entry.data.changes.slice(0, 4),
      date: entry.data.date.toISOString(),
      weight: entry.data.featured ? 3 : 1,
      text: `${entry.data.version} ${entry.data.summary} ${changelogTypeLabels[entry.data.type]} ${entry.data.changes.join(" ")} ${entry.body}`,
    })),
    ...topics.map((topic) => ({
      type: "主题" as const,
      kind: "topic" as const,
      title: topic.title,
      description: topic.description,
      href: `/topics#${topic.id}`,
      category: "主题地图",
      tags: topic.keywords,
      date: String(topic.posts.length + topic.works.length + topic.worlds.length + topic.notes.length + topic.links.length),
      weight: 1,
      text: `${topic.title} ${topic.description} ${topic.keywords.join(" ")}`,
    })),
  ];
}
