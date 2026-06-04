import type { CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;
export type WorkEntry = CollectionEntry<"works">;
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
}

export interface SearchEntry {
  type: "文章" | "作品" | "主题";
  kind: "blog" | "work" | "topic";
  title: string;
  description: string;
  href: string;
  category: string;
  tags: string[];
  date: string;
  weight: number;
  text: string;
}
