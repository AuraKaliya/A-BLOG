import { getAllResourceArticleTags, getAllResourceArticles } from "../articles";
import { getTopicSummaries } from "./topics";
import { getAllWorkCategories, getFeaturedWorks, getPublishedWorks } from "./works";
import { getPublishedWorldEntries } from "./world";
import { getRecentUpdates } from "./discovery";
import { getPublishedNotes } from "./notes";
import { getPublishedLinks } from "./links";

export async function getContentStats() {
  const [articles, works, worlds, notes, links, tags, workCategories, topics] = await Promise.all([
    getAllResourceArticles(),
    getPublishedWorks(),
    getPublishedWorldEntries(),
    getPublishedNotes(),
    getPublishedLinks(),
    getAllResourceArticleTags(),
    getAllWorkCategories(),
    getTopicSummaries(),
  ]);
  const articleCategories = new Set(articles.map((article) => article.category).filter(Boolean));

  return {
    postCount: articles.length,
    workCount: works.length,
    worldCount: worlds.length,
    noteCount: notes.length,
    linkCount: links.length,
    tagCount: tags.length,
    categoryCount: articleCategories.size + workCategories.length,
    topicCount: topics.length,
  };
}

export async function getHomepageFeed() {
  const [posts, works, featuredWorks, recentUpdates] = await Promise.all([
    getAllResourceArticles(),
    getPublishedWorks(),
    getFeaturedWorks(4),
    getRecentUpdates(6),
  ]);
  return { posts: posts.slice(0, 3), works, featuredWorks, recentUpdates };
}
