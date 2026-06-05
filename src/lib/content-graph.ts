import { getPublishedPosts } from "./queries/blog";
import { getPublishedNotes } from "./queries/notes";
import { getPublishedLinks } from "./queries/links";
import { getTopicDefinitions } from "./queries/topics";
import { getPublishedWorks } from "./queries/works";
import { getPublishedWorldEntries } from "./queries/world";
import { getDuplicates } from "./validation";

let validationPromise: Promise<void> | undefined;

async function validateContentGraph() {
  const [posts, works, worlds, notes, links, topics] = await Promise.all([
    getPublishedPosts(),
    getPublishedWorks(),
    getPublishedWorldEntries(),
    getPublishedNotes(),
    getPublishedLinks(),
    getTopicDefinitions(),
  ]);
  const issues: string[] = [];

  const topicIds = new Set(topics.map((topic) => topic.id));
  const postSlugs = new Set(posts.map((post) => post.slug));
  const workSlugs = new Set(works.map((work) => work.slug));
  const worldSlugs = new Set(worlds.map((entry) => entry.slug));
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

  worlds.forEach((entry) => {
    getDuplicates(entry.data.tags).forEach((tag) => {
      issues.push(`world:${entry.slug} has duplicate tag "${tag}"`);
    });

    getDuplicates(entry.data.topics).forEach((topicId) => {
      issues.push(`world:${entry.slug} has duplicate topic "${topicId}"`);
    });

    getDuplicates(entry.data.relatedEntries).forEach((relatedSlug) => {
      issues.push(`world:${entry.slug} has duplicate related entry "${relatedSlug}"`);
    });

    entry.data.topics.forEach((topicId) => {
      if (!topicIds.has(topicId)) {
        issues.push(`world:${entry.slug} references missing topic "${topicId}"`);
        return;
      }

      topicUsage.set(topicId, (topicUsage.get(topicId) ?? 0) + 1);
    });

    entry.data.relatedEntries.forEach((relatedSlug) => {
      if (!worldSlugs.has(relatedSlug)) {
        issues.push(`world:${entry.slug} references missing world entry "${relatedSlug}"`);
      }

      if (relatedSlug === entry.slug) {
        issues.push(`world:${entry.slug} cannot reference itself`);
      }
    });
  });

  notes.forEach((note) => {
    getDuplicates(note.data.tags).forEach((tag) => {
      issues.push(`note:${note.slug} has duplicate tag "${tag}"`);
    });

    getDuplicates(note.data.topics).forEach((topicId) => {
      issues.push(`note:${note.slug} has duplicate topic "${topicId}"`);
    });

    note.data.topics.forEach((topicId) => {
      if (!topicIds.has(topicId)) {
        issues.push(`note:${note.slug} references missing topic "${topicId}"`);
        return;
      }

      topicUsage.set(topicId, (topicUsage.get(topicId) ?? 0) + 1);
    });
  });

  links.forEach((link) => {
    getDuplicates(link.data.tags).forEach((tag) => {
      issues.push(`link:${link.slug} has duplicate tag "${tag}"`);
    });

    getDuplicates(link.data.topics).forEach((topicId) => {
      issues.push(`link:${link.slug} has duplicate topic "${topicId}"`);
    });

    if (link.data.featured && link.data.topics.length === 0) {
      issues.push(`link:${link.slug} is featured but has no topics`);
    }

    link.data.topics.forEach((topicId) => {
      if (!topicIds.has(topicId)) {
        issues.push(`link:${link.slug} references missing topic "${topicId}"`);
        return;
      }

      topicUsage.set(topicId, (topicUsage.get(topicId) ?? 0) + 1);
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
      issues.push(`topic:${topic.id} is never referenced by published content`);
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
