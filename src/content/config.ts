import { defineCollection, z } from "astro:content";
import { blogCategoryKeys } from "../config/taxonomy";

const linkSchema = z.object({
  label: z.string(),
  href: z.string(),
  kind: z.enum(["demo", "source", "article", "external"]).default("external"),
});

const socialCardSchema = z.object({
  platform: z.string(),
  handle: z.string(),
  description: z.string(),
  href: z.string(),
  accent: z.enum(["cyan", "orange", "green"]).default("cyan"),
});

const coverSchema = z.string().refine(
  (value) =>
    value.startsWith("/resource/") ||
    value.startsWith("/og/") ||
    /^https?:\/\//.test(value),
  {
    message: "Cover paths should use /resource/..., /og/..., or an absolute http(s) URL.",
  },
);

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

const simpleLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

const cardSchema = z.object({
  label: z.string().optional(),
  title: z.string(),
  description: z.string(),
  href: z.string().optional(),
  actionLabel: z.string().optional(),
  featured: z.boolean().default(false),
  icon: z.enum(["article", "grid", "lab", "nodes", "rss", "mail", "world", "spark", "history"]).optional(),
  items: z.array(z.string()).default([]),
});

const homePage = z.object({
  kind: z.literal("home"),
  title: z.string(),
  description: z.string(),
  profile: z.object({
    eyebrow: z.string().default("Profile"),
    name: z.string(),
    role: z.string(),
    status: z.string(),
    location: z.string(),
    bio: z.string(),
    imageIndex: z.string().optional(),
    imageAlt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    links: z.array(simpleLinkSchema).default([]),
  }),
  recentStatus: z.object({
    eyebrow: z.string().default("近期状态"),
    title: z.string(),
    description: z.string(),
    imageIndex: z.string().optional(),
    imageAlt: z.string().optional(),
    href: z.string().optional(),
  }),
  randomExplore: z.object({
    eyebrow: z.string().default("Explore"),
    title: z.string(),
    description: z.string(),
    actionLabel: z.string(),
  }),
  intro: z.object({
    eyebrow: z.string().default("About this site"),
    title: z.string(),
    lead: z.string(),
    highlights: z.array(
      z.object({
        keyword: z.string(),
        title: z.string(),
        description: z.string(),
        href: z.string(),
      }),
    ).default([]),
  }),
  hero: z.object({
    title: z.string(),
    description: z.string(),
    actions: z.array(heroActionSchema).default([]),
    metrics: z.array(heroMetricSchema).default([]),
  }).optional(),
  portalCards: z.array(cardSchema).default([]),
  suggestedPostColumns: z.array(z.string()).default([]),
  labCards: z.array(cardSchema).default([]),
  roadmapItems: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    }),
  ).default([]),
  aboutStory: z.object({
    title: z.string(),
    description: z.string(),
    href: z.string(),
    actionLabel: z.string(),
  }).optional(),
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
  socialCards: z.array(socialCardSchema).default([]),
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
    section: z.enum(["writings", "tech"]).default("tech"),
    category: z.enum(blogCategoryKeys).default("engineering"),
    series: z.string().optional(),
    cover: coverSchema.optional(),
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
    updatedDate: z.coerce.date().optional(),
    role: z.string(),
    category: z.enum(["project", "writing", "tool", "research", "experiment"]),
    status: z.enum(["concept", "building", "shipped", "archived"]).default("building"),
    priority: z.number().default(0),
    techStack: z.array(z.string()).default([]),
    cover: coverSchema.optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    topics: z.array(z.string()).default([]),
    relatedPosts: z.array(z.string()).default([]),
    relatedWorks: z.array(z.string()).default([]),
    links: z.array(linkSchema).default([]),
  }),
});

const world = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    kind: z.enum(["character", "location", "organization", "event", "rule", "term"]),
    status: z.enum(["seed", "organizing", "published"]).default("organizing"),
    era: z.string().optional(),
    eventDate: z.string().optional(),
    sortOrder: z.number().default(0),
    updatedDate: z.coerce.date(),
    cover: coverSchema.optional(),
    featured: z.boolean().default(false),
    topics: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    relatedEntries: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const changelog = defineCollection({
  type: "content",
  schema: z.object({
    version: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    type: z.enum(["content", "feature", "design", "maintenance"]).default("content"),
    changes: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const notes = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    kind: z.enum(["thought", "status", "link", "fragment"]).default("thought"),
    mood: z.string().optional(),
    externalUrl: z.string().url().optional(),
    featured: z.boolean().default(false),
    topics: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const links = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    note: z.string(),
    url: z.string().url(),
    feedUrl: z.string().url().optional(),
    kind: z.enum(["friend", "reading", "tool", "inspiration", "reference"]).default("reading"),
    language: z.string().default("中文"),
    addedDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    featured: z.boolean().default(false),
    topics: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
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

export const collections = { blog, works, world, changelog, notes, links, topics, pages };
