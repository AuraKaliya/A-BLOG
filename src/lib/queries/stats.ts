import { getAllBlogCategories, getAllBlogTags, getFeaturedPosts, getPublishedPosts } from "./blog";
import { getTopicSummaries } from "./topics";
import { getAllWorkCategories, getFeaturedWorks, getPublishedWorks } from "./works";

export async function getContentStats() {
  const [posts, works, tags, categories, workCategories, topics] = await Promise.all([
    getPublishedPosts(),
    getPublishedWorks(),
    getAllBlogTags(),
    getAllBlogCategories(),
    getAllWorkCategories(),
    getTopicSummaries(),
  ]);

  return {
    postCount: posts.length,
    workCount: works.length,
    tagCount: tags.length,
    categoryCount: categories.length + workCategories.length,
    topicCount: topics.length,
  };
}

export async function getHomepageFeed() {
  const [posts, works, featuredWorks] = await Promise.all([getFeaturedPosts(3), getPublishedWorks(), getFeaturedWorks(4)]);
  return { posts, works, featuredWorks };
}
