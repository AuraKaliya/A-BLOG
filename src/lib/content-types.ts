import type { CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;
export type WorkEntry = CollectionEntry<"works">;
export type WorldEntry = CollectionEntry<"world">;
export type ChangelogEntry = CollectionEntry<"changelog">;
export type NoteEntry = CollectionEntry<"notes">;
export type LinkEntry = CollectionEntry<"links">;
export type TopicEntry = CollectionEntry<"topics">;
export type PageEntry = CollectionEntry<"pages">;
export type HomePageEntry = Omit<PageEntry, "data"> & { data: Extract<PageEntry["data"], { kind: "home" }> };
export type AboutPageEntry = Omit<PageEntry, "data"> & { data: Extract<PageEntry["data"], { kind: "about" }> };
export type LabPageEntry = Omit<PageEntry, "data"> & { data: Extract<PageEntry["data"], { kind: "lab" }> };
export type NowPageEntry = Omit<PageEntry, "data"> & { data: Extract<PageEntry["data"], { kind: "now" }> };

export interface TopicSummary {
  id: string;
  title: string;
  description: string;
  accent: TopicEntry["data"]["accent"];
  keywords: string[];
  posts: BlogPost[];
  works: WorkEntry[];
  worlds: WorldEntry[];
  notes: NoteEntry[];
  links: LinkEntry[];
}

export interface SearchEntry {
  type: "文章" | "作品" | "世界条目" | "短动态" | "推荐链接" | "更新记录" | "主题";
  kind: "blog" | "work" | "world" | "note" | "link" | "changelog" | "topic";
  title: string;
  description: string;
  href: string;
  category: string;
  tags: string[];
  date: string;
  weight: number;
  text: string;
}

export interface RecentUpdate {
  kind: "blog" | "work" | "world" | "note" | "link" | "changelog";
  type: string;
  title: string;
  description: string;
  href: string;
  date: Date;
}

export interface ExploreEntry {
  kind: "blog" | "work" | "world" | "note" | "link";
  title: string;
  href: string;
}

export interface ArchiveEntry {
  kind: "blog" | "work" | "world" | "note" | "link" | "changelog";
  type: string;
  title: string;
  description: string;
  href: string;
  date: Date;
  tags: string[];
}

export type ContentGraphNodeKind = "topic" | "blog" | "work" | "world" | "note" | "link";

export interface ContentGraphNode {
  id: string;
  kind: ContentGraphNodeKind;
  title: string;
  description: string;
  href: string;
  x: number;
  y: number;
  radius: number;
  featured: boolean;
  topicIds: string[];
}

export interface ContentGraphEdge {
  id: string;
  source: string;
  target: string;
  kind: "topic" | "related";
}

export interface ContentGraphData {
  nodes: ContentGraphNode[];
  edges: ContentGraphEdge[];
  counts: Record<ContentGraphNodeKind, number>;
}
