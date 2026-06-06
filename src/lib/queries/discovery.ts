import { changelogTypeLabels, linkKindLabels, noteKindLabels, workCategoryLabels, worldKindLabels } from "../../config/taxonomy";
import { getAllResourceArticles } from "../articles";
import type { ExploreEntry, RecentUpdate } from "../content-types";
import { getPublishedChangelogEntries } from "./changelog";
import { getPublishedWorks } from "./works";
import { getPublishedWorldEntries } from "./world";
import { getPublishedNotes } from "./notes";
import { getPublishedLinks } from "./links";

function workDate(year: number, updatedDate?: Date) {
  return updatedDate ?? new Date(Date.UTC(year, 0, 1));
}

export async function getRecentUpdates(limit = 8): Promise<RecentUpdate[]> {
  const [articles, works, worldEntries, notes, links, changelogEntries] = await Promise.all([
    getAllResourceArticles(),
    getPublishedWorks(),
    getPublishedWorldEntries(),
    getPublishedNotes(),
    getPublishedLinks(),
    getPublishedChangelogEntries(),
  ]);

  return [
    ...articles.map((article) => ({
      kind: "blog" as const,
      type: article.category || "文字",
      title: article.title,
      description: article.summary,
      href: `/writings/${article.slug}`,
      date: article.updatedDate ?? article.pubDate,
    })),
    ...works.map((work) => ({
      kind: "work" as const,
      type: workCategoryLabels[work.data.category],
      title: work.data.title,
      description: work.data.description,
      href: `/works/${work.slug}`,
      date: workDate(work.data.year, work.data.updatedDate),
    })),
    ...worldEntries.map((entry) => ({
      kind: "world" as const,
      type: worldKindLabels[entry.data.kind],
      title: entry.data.title,
      description: entry.data.description,
      href: `/world/${entry.slug}`,
      date: entry.data.updatedDate,
    })),
    ...notes.map((note) => ({
      kind: "note" as const,
      type: noteKindLabels[note.data.kind],
      title: note.data.title,
      description: note.data.description,
      href: `/notes/${note.slug}`,
      date: note.data.updatedDate ?? note.data.pubDate,
    })),
    ...links.map((link) => ({
      kind: "link" as const,
      type: linkKindLabels[link.data.kind],
      title: link.data.title,
      description: link.data.description,
      href: `/links#${link.slug}`,
      date: link.data.updatedDate ?? link.data.addedDate,
    })),
    ...changelogEntries.map((entry) => ({
      kind: "changelog" as const,
      type: changelogTypeLabels[entry.data.type],
      title: entry.data.version,
      description: entry.data.summary,
      href: `/changelog#${entry.slug}`,
      date: entry.data.date,
    })),
  ]
    .sort((a, b) => b.date.valueOf() - a.date.valueOf())
    .slice(0, limit);
}

export async function getExploreEntries(): Promise<ExploreEntry[]> {
  const [articles, works, worldEntries, notes, links] = await Promise.all([
    getAllResourceArticles(),
    getPublishedWorks(),
    getPublishedWorldEntries(),
    getPublishedNotes(),
    getPublishedLinks(),
  ]);

  return [
    ...articles.map((article) => ({ kind: "blog" as const, title: article.title, href: `/writings/${article.slug}` })),
    ...works.map((work) => ({ kind: "work" as const, title: work.data.title, href: `/works/${work.slug}` })),
    ...worldEntries.map((entry) => ({ kind: "world" as const, title: entry.data.title, href: `/world/${entry.slug}` })),
    ...notes.map((note) => ({ kind: "note" as const, title: note.data.title, href: `/notes/${note.slug}` })),
    ...links.map((link) => ({ kind: "link" as const, title: link.data.title, href: `/links#${link.slug}` })),
  ];
}
