import { getCollection } from "astro:content";
import { blogCategoryKeys } from "../../config/taxonomy";
import type { BlogPost } from "../content-types";

export function sortPostsByDate(posts: BlogPost[]) {
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getPublishedPosts() {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return sortPostsByDate(posts);
}

export async function getFeaturedPosts(limit = 3) {
  const posts = await getPublishedPosts();
  return posts.filter((post) => post.data.featured).concat(posts.filter((post) => !post.data.featured)).slice(0, limit);
}

export async function getAllBlogTags() {
  const posts = await getPublishedPosts();
  return [...new Set(posts.flatMap((post) => post.data.tags))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export async function getAllBlogCategories() {
  const posts = await getPublishedPosts();
  const categories = new Set(posts.map((post) => post.data.category));
  return blogCategoryKeys.filter((category) => categories.has(category));
}

export async function getAllBlogSeries() {
  const posts = await getPublishedPosts();
  return [...new Set(posts.map((post) => post.data.series).filter((series): series is string => Boolean(series)))].sort((a, b) =>
    a.localeCompare(b, "zh-CN"),
  );
}

export async function getPostsByCategory(category: string) {
  const posts = await getPublishedPosts();
  return posts.filter((post) => post.data.category === category);
}

export async function getPostsByTag(tag: string) {
  const posts = await getPublishedPosts();
  return posts.filter((post) => post.data.tags.includes(tag));
}

export async function getPostsBySeries(series: string) {
  const posts = await getPublishedPosts();
  return posts.filter((post) => post.data.series === series);
}

export async function getPostsByTopic(topicId: string) {
  const posts = await getPublishedPosts();
  return posts.filter((post) => post.data.topics.includes(topicId));
}

export async function getPostsBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];

  const posts = await getPublishedPosts();
  const postsBySlug = new Map(posts.map((post) => [post.slug, post]));
  const missing = slugs.filter((slug) => !postsBySlug.has(slug));

  if (missing.length > 0) {
    throw new Error(`Missing related blog posts: ${missing.join(", ")}`);
  }

  return slugs.map((slug) => postsBySlug.get(slug)!);
}

export function getAdjacentPosts(posts: BlogPost[], slug: string) {
  const index = posts.findIndex((post) => post.slug === slug);
  return {
    previous: index >= 0 ? posts[index + 1] : undefined,
    next: index > 0 ? posts[index - 1] : undefined,
  };
}
