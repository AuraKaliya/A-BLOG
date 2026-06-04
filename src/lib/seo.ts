import type { BlogPost, TopicSummary, WorkEntry } from "./content-types";
import { siteConfig } from "../config/site";
import { workCategoryLabels } from "../config/taxonomy";

type StructuredData = Record<string, unknown>;

interface BreadcrumbItem {
  name: string;
  path?: string;
}

function absoluteUrl(path: string) {
  return new URL(path, siteConfig.url).toString();
}

function personSchema() {
  return {
    "@type": "Person",
    name: siteConfig.author.name,
    url: siteConfig.author.social,
  };
}

export function buildBreadcrumbStructuredData(items: BreadcrumbItem[]): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path ?? "/"),
    })),
  };
}

export function buildBlogPostingStructuredData(post: BlogPost): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.data.title,
    description: post.data.description,
    datePublished: post.data.pubDate.toISOString(),
    dateModified: (post.data.updatedDate ?? post.data.pubDate).toISOString(),
    author: personSchema(),
    publisher: personSchema(),
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    url: absoluteUrl(`/blog/${post.slug}`),
    articleSection: post.data.category,
    keywords: [...post.data.tags, ...post.data.topics].join(", "),
    about: post.data.topics.map((topic) => ({
      "@type": "Thing",
      name: topic,
    })),
  };
}

export function buildCreativeWorkStructuredData(work: WorkEntry): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    headline: work.data.title,
    name: work.data.title,
    description: work.data.description,
    author: personSchema(),
    creator: personSchema(),
    dateCreated: `${work.data.year}-01-01`,
    dateModified: `${work.data.year}-12-31`,
    url: absoluteUrl(`/works/${work.slug}`),
    genre: workCategoryLabels[work.data.category],
    keywords: [...work.data.techStack, ...work.data.topics].join(", "),
    about: work.data.topics.map((topic) => ({
      "@type": "Thing",
      name: topic,
    })),
  };
}

export function buildCollectionPageStructuredData(options: {
  title: string;
  description: string;
  path: string;
  itemCount: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: options.title,
    headline: options.title,
    description: options.description,
    url: absoluteUrl(options.path),
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.title,
      url: siteConfig.url,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: options.itemCount,
    },
  };
}

export function buildTopicSummaryStructuredData(topics: TopicSummary[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "主题地图",
    description: "把博客、作品和实验按照长期关注方向重新组织。",
    url: absoluteUrl("/topics"),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: topics.length,
      itemListElement: topics.map((topic, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/topics#${topic.id}`),
        name: topic.title,
      })),
    },
  };
}
