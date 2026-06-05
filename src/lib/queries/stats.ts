import { getAllBlogCategories, getAllBlogTags, getFeaturedPosts, getPublishedPosts } from "./blog";
import { getTopicSummaries } from "./topics";
import { getAllWorkCategories, getFeaturedWorks, getPublishedWorks } from "./works";
import { getPublishedWorldEntries } from "./world";
import { getRecentUpdates } from "./discovery";
import { getPublishedNotes } from "./notes";
import { getPublishedLinks } from "./links";

export async function getContentStats() {
  const [posts, works, worlds, notes, links, tags, categories, workCategories, topics] = await Promise.all([
    getPublishedPosts(),
    getPublishedWorks(),
    getPublishedWorldEntries(),
    getPublishedNotes(),
    getPublishedLinks(),
    getAllBlogTags(),
    getAllBlogCategories(),
    getAllWorkCategories(),
    getTopicSummaries(),
  ]);

  return {
    postCount: posts.length,
    workCount: works.length,
    worldCount: worlds.length,
    noteCount: notes.length,
    linkCount: links.length,
    tagCount: tags.length,
    categoryCount: categories.length + workCategories.length,
    topicCount: topics.length,
  };
}

export async function getHomepageFeed() {
  const [posts, works, featuredWorks, recentUpdates] = await Promise.all([
    getFeaturedPosts(3),
    getPublishedWorks(),
    getFeaturedWorks(4),
    getRecentUpdates(6),
  ]);
  return { posts, works, featuredWorks, recentUpdates };
}
