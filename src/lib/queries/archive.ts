import { changelogTypeLabels, linkKindLabels, noteKindLabels, workCategoryLabels, worldKindLabels } from "../../config/taxonomy";
import { getAllResourceArticles } from "../articles";
import type { ArchiveEntry } from "../content-types";
import { getPublishedChangelogEntries } from "./changelog";
import { getPublishedNotes } from "./notes";
import { getPublishedLinks } from "./links";
import { getPublishedWorks } from "./works";
import { getPublishedWorldEntries } from "./world";

function workDate(year: number, updatedDate?: Date) {
  return updatedDate ?? new Date(Date.UTC(year, 0, 1));
}

export async function getArchiveEntries(): Promise<ArchiveEntry[]> {
  const [articles, works, worlds, notes, links, changelogEntries] = await Promise.all([
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
      tags: article.tags,
    })),
    ...works.map((work) => ({
      kind: "work" as const,
      type: workCategoryLabels[work.data.category],
      title: work.data.title,
      description: work.data.description,
      href: `/works/${work.slug}`,
      date: workDate(work.data.year, work.data.updatedDate),
      tags: [...work.data.techStack, ...work.data.topics],
    })),
    ...worlds.map((entry) => ({
      kind: "world" as const,
      type: worldKindLabels[entry.data.kind],
      title: entry.data.title,
      description: entry.data.description,
      href: `/world/${entry.slug}`,
      date: entry.data.updatedDate,
      tags: [...entry.data.tags, ...entry.data.topics],
    })),
    ...notes.map((note) => ({
      kind: "note" as const,
      type: noteKindLabels[note.data.kind],
      title: note.data.title,
      description: note.data.description,
      href: `/notes/${note.slug}`,
      date: note.data.updatedDate ?? note.data.pubDate,
      tags: [...note.data.tags, ...note.data.topics],
    })),
    ...links.map((link) => ({
      kind: "link" as const,
      type: linkKindLabels[link.data.kind],
      title: link.data.title,
      description: link.data.description,
      href: `/links#${link.slug}`,
      date: link.data.updatedDate ?? link.data.addedDate,
      tags: [...link.data.tags, ...link.data.topics],
    })),
    ...changelogEntries.map((entry) => ({
      kind: "changelog" as const,
      type: changelogTypeLabels[entry.data.type],
      title: entry.data.version,
      description: entry.data.summary,
      href: `/changelog#${entry.slug}`,
      date: entry.data.date,
      tags: entry.data.changes.slice(0, 4),
    })),
  ].sort((a, b) => b.date.valueOf() - a.date.valueOf());
}
