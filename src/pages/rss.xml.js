import rss from "@astrojs/rss";
import { getPublishedLinks, getPublishedNotes, getPublishedPosts } from "../lib/content";
import { siteConfig } from "../config/site";

export async function GET(context) {
  const [posts, notes, links] = await Promise.all([getPublishedPosts(), getPublishedNotes(), getPublishedLinks()]);
  const items = [
    ...posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.slug}/`,
    })),
    ...notes.map((note) => ({
      title: `短动态：${note.data.title}`,
      description: note.data.description,
      pubDate: note.data.pubDate,
      link: `/notes/${note.slug}/`,
    })),
    ...links.map((entry) => ({
      title: `推荐：${entry.data.title}`,
      description: `${entry.data.description} ${entry.data.note}`,
      pubDate: entry.data.updatedDate ?? entry.data.addedDate,
      link: `/links/#${entry.slug}`,
    })),
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site ?? siteConfig.url,
    items,
  });
}
