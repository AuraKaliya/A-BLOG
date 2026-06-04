import { defineCollection, z } from "astro:content";
import { blogCategoryKeys } from "../config/taxonomy";

const linkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

const heroActionSchema = z.object({
  label: z.string(),
  href: z.string(),
  variant: z.enum(["primary", "secondary"]).default("primary"),
});

const heroMetricSchema = z.object({
  eyebrow: z.string(),
  value: z.string(),
  description: z.string(),
});

const cardSchema = z.object({
  label: z.string().optional(),
  title: z.string(),
  description: z.string(),
  href: z.string().optional(),
  actionLabel: z.string().optional(),
  featured: z.boolean().default(false),
  icon: z.enum(["article", "grid", "lab", "nodes", "rss", "mail"]).optional(),
  items: z.array(z.string()).default([]),
});

const homePage = z.object({
  kind: z.literal("home"),
  title: z.string(),
  description: z.string(),
  hero: z.object({
    title: z.string(),
    description: z.string(),
    actions: z.array(heroActionSchema).default([]),
    metrics: z.array(heroMetricSchema).default([]),
  }),
  portalCards: z.array(cardSchema).default([]),
  suggestedPostColumns: z.array(z.string()).default([]),
  labCards: z.array(cardSchema).default([]),
  roadmapItems: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    }),
  ),
  aboutStory: z.object({
    title: z.string(),
    description: z.string(),
    href: z.string(),
    actionLabel: z.string(),
  }),
});

const aboutPage = z.object({
  kind: z.literal("about"),
  title: z.string(),
  description: z.string(),
  intro: z.object({
    title: z.string(),
    description: z.string(),
  }),
  focusAreas: z.array(z.string()).default([]),
  stackCards: z.array(cardSchema).default([]),
  contact: z.object({
    ctaLabel: z.string(),
    emailLabel: z.string(),
    githubLabel: z.string(),
    socialLabel: z.string(),
  }),
});

const labPage = z.object({
  kind: z.literal("lab"),
  title: z.string(),
  description: z.string(),
  intro: z.object({
    title: z.string(),
    description: z.string(),
  }),
  cards: z.array(cardSchema).default([]),
});

const nowPage = z.object({
  kind: z.literal("now"),
  title: z.string(),
  description: z.string(),
  intro: z.object({
    title: z.string(),
    description: z.string(),
  }),
  focusAreas: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    }),
  ),
  tracks: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      items: z.array(z.string()).default([]),
    }),
  ),
});

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(blogCategoryKeys).default("engineering"),
    series: z.string().optional(),
    cover: z.string().optional(),
    featured: z.boolean().default(false),
    relatedWorks: z.array(z.string()).default([]),
    topics: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const works = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    year: z.number(),
    role: z.string(),
    category: z.enum(["project", "writing", "tool", "research", "experiment"]),
    status: z.enum(["concept", "building", "shipped", "archived"]).default("building"),
    priority: z.number().default(0),
    techStack: z.array(z.string()).default([]),
    cover: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    topics: z.array(z.string()).default([]),
    relatedPosts: z.array(z.string()).default([]),
    relatedWorks: z.array(z.string()).default([]),
    links: z.array(linkSchema).default([]),
  }),
});

const topics = defineCollection({
  type: "data",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    accent: z.enum(["cyan", "orange", "green"]),
    keywords: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    order: z.number().default(0),
  }),
});

const pages = defineCollection({
  type: "data",
  schema: z.discriminatedUnion("kind", [homePage, aboutPage, labPage, nowPage]),
});

export const collections = { blog, works, topics, pages };
