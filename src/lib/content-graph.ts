import { getPublishedPosts } from "./queries/blog";
import { getTopicDefinitions } from "./queries/topics";
import { getPublishedWorks } from "./queries/works";
import { getDuplicates } from "./validation";

let validationPromise: Promise<void> | undefined;

async function validateContentGraph() {
  const [posts, works, topics] = await Promise.all([getPublishedPosts(), getPublishedWorks(), getTopicDefinitions()]);
  const issues: string[] = [];

  const topicIds = new Set(topics.map((topic) => topic.id));
  const postSlugs = new Set(posts.map((post) => post.slug));
  const workSlugs = new Set(works.map((work) => work.slug));
  const topicUsage = new Map(topics.map((topic) => [topic.id, 0]));

  posts.forEach((post) => {
    getDuplicates(post.data.tags).forEach((tag) => {
      issues.push(`blog:${post.slug} has duplicate tag "${tag}"`);
    });

    getDuplicates(post.data.topics).forEach((topicId) => {
      issues.push(`blog:${post.slug} has duplicate topic "${topicId}"`);
    });

    getDuplicates(post.data.relatedWorks).forEach((workSlug) => {
      issues.push(`blog:${post.slug} has duplicate related work "${workSlug}"`);
    });

    if (post.data.featured && post.data.topics.length === 0) {
      issues.push(`blog:${post.slug} is featured but has no topics`);
    }

    post.data.topics.forEach((topicId) => {
      if (!topicIds.has(topicId)) {
        issues.push(`blog:${post.slug} references missing topic "${topicId}"`);
        return;
      }

      topicUsage.set(topicId, (topicUsage.get(topicId) ?? 0) + 1);
    });

    post.data.relatedWorks.forEach((workSlug) => {
      if (!workSlugs.has(workSlug)) {
        issues.push(`blog:${post.slug} references missing work "${workSlug}"`);
      }

      if (workSlug === post.slug) {
        issues.push(`blog:${post.slug} cannot reference itself as related work`);
      }
    });
  });

  works.forEach((work) => {
    getDuplicates(work.data.techStack).forEach((item) => {
      issues.push(`work:${work.slug} has duplicate tech stack item "${item}"`);
    });

    getDuplicates(work.data.topics).forEach((topicId) => {
      issues.push(`work:${work.slug} has duplicate topic "${topicId}"`);
    });

    getDuplicates(work.data.relatedPosts).forEach((postSlug) => {
      issues.push(`work:${work.slug} has duplicate related post "${postSlug}"`);
    });

    getDuplicates(work.data.relatedWorks).forEach((workSlug) => {
      issues.push(`work:${work.slug} has duplicate related work "${workSlug}"`);
    });

    if (work.data.featured && work.data.topics.length === 0) {
      issues.push(`work:${work.slug} is featured but has no topics`);
    }

    work.data.topics.forEach((topicId) => {
      if (!topicIds.has(topicId)) {
        issues.push(`work:${work.slug} references missing topic "${topicId}"`);
        return;
      }

      topicUsage.set(topicId, (topicUsage.get(topicId) ?? 0) + 1);
    });

    work.data.relatedPosts.forEach((postSlug) => {
      if (!postSlugs.has(postSlug)) {
        issues.push(`work:${work.slug} references missing post "${postSlug}"`);
      }
    });

    work.data.relatedWorks.forEach((workSlug) => {
      if (!workSlugs.has(workSlug)) {
        issues.push(`work:${work.slug} references missing work "${workSlug}"`);
      }

      if (workSlug === work.slug) {
        issues.push(`work:${work.slug} cannot reference itself as related work`);
      }
    });
  });

  topics.forEach((topic) => {
    getDuplicates(topic.data.keywords).forEach((keyword) => {
      issues.push(`topic:${topic.id} has duplicate keyword "${keyword}"`);
    });

    if (topic.data.keywords.length === 0) {
      issues.push(`topic:${topic.id} must define at least one keyword`);
    }

    const usageCount = topicUsage.get(topic.id) ?? 0;
    if (usageCount === 0) {
      issues.push(`topic:${topic.id} is never referenced by any post or work`);
    }
  });

  if (issues.length > 0) {
    throw new Error(`Content graph validation failed:\n- ${issues.join("\n- ")}`);
  }
}

export async function assertValidContentGraph() {
  if (!validationPromise) {
    validationPromise = validateContentGraph();
  }

  await validationPromise;
}
