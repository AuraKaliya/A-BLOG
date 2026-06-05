import { assertValidContentGraph } from "../content-graph";
import type { ContentGraphData, ContentGraphEdge, ContentGraphNode, ContentGraphNodeKind } from "../content-types";
import { getPublishedPosts } from "./blog";
import { getPublishedNotes } from "./notes";
import { getPublishedLinks } from "./links";
import { getTopicDefinitions } from "./topics";
import { getPublishedWorks } from "./works";
import { getPublishedWorldEntries } from "./world";

const centerX = 560;
const centerY = 380;

function positionOnEllipse(index: number, total: number, radiusX: number, radiusY: number, offset = -Math.PI / 2) {
  const angle = offset + (index / Math.max(total, 1)) * Math.PI * 2;
  return {
    x: Math.round(centerX + Math.cos(angle) * radiusX),
    y: Math.round(centerY + Math.sin(angle) * radiusY),
  };
}

function graphNode(options: Omit<ContentGraphNode, "x" | "y">, position: { x: number; y: number }): ContentGraphNode {
  return { ...options, ...position };
}

export async function getContentGraphData(): Promise<ContentGraphData> {
  await assertValidContentGraph();

  const [topics, posts, works, worlds, notes, links] = await Promise.all([
    getTopicDefinitions(),
    getPublishedPosts(),
    getPublishedWorks(),
    getPublishedWorldEntries(),
    getPublishedNotes(),
    getPublishedLinks(),
  ]);

  const contentNodes = [
    ...posts.map((post) => ({
      id: `blog:${post.slug}`,
      kind: "blog" as const,
      title: post.data.title,
      description: post.data.description,
      href: `/blog/${post.slug}`,
      radius: post.data.featured ? 21 : 17,
      featured: post.data.featured,
      topicIds: post.data.topics,
    })),
    ...works.map((work) => ({
      id: `work:${work.slug}`,
      kind: "work" as const,
      title: work.data.title,
      description: work.data.description,
      href: `/works/${work.slug}`,
      radius: work.data.featured ? 21 : 17,
      featured: work.data.featured,
      topicIds: work.data.topics,
    })),
    ...worlds.map((entry) => ({
      id: `world:${entry.slug}`,
      kind: "world" as const,
      title: entry.data.title,
      description: entry.data.description,
      href: `/world/${entry.slug}`,
      radius: entry.data.featured ? 21 : 17,
      featured: entry.data.featured,
      topicIds: entry.data.topics,
    })),
    ...notes.map((note) => ({
      id: `note:${note.slug}`,
      kind: "note" as const,
      title: note.data.title,
      description: note.data.description,
      href: `/notes/${note.slug}`,
      radius: note.data.featured ? 21 : 17,
      featured: note.data.featured,
      topicIds: note.data.topics,
    })),
    ...links.map((link) => ({
      id: `link:${link.slug}`,
      kind: "link" as const,
      title: link.data.title,
      description: link.data.description,
      href: `/links#${link.slug}`,
      radius: link.data.featured ? 21 : 17,
      featured: link.data.featured,
      topicIds: link.data.topics,
    })),
  ];

  const nodes: ContentGraphNode[] = [
    ...topics.map((topic, index) =>
      graphNode(
        {
          id: `topic:${topic.id}`,
          kind: "topic",
          title: topic.data.title,
          description: topic.data.description,
          href: `/topics#${topic.id}`,
          radius: 28,
          featured: topic.data.featured,
          topicIds: [topic.id],
        },
        positionOnEllipse(index, topics.length, 160, 118),
      ),
    ),
    ...contentNodes.map((node, index) => graphNode(node, positionOnEllipse(index, contentNodes.length, 455, 295))),
  ];

  const edges: ContentGraphEdge[] = [];
  const edgeKeys = new Set<string>();
  const addEdge = (source: string, target: string, kind: ContentGraphEdge["kind"]) => {
    const endpoints = kind === "related" ? [source, target].sort() : [source, target];
    const key = `${kind}:${endpoints[0]}:${endpoints[1]}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ id: `edge-${edges.length + 1}`, source: endpoints[0], target: endpoints[1], kind });
  };

  contentNodes.forEach((node) => {
    node.topicIds.forEach((topicId) => addEdge(`topic:${topicId}`, node.id, "topic"));
  });

  posts.forEach((post) => {
    post.data.relatedWorks.forEach((workSlug) => addEdge(`blog:${post.slug}`, `work:${workSlug}`, "related"));
  });
  works.forEach((work) => {
    work.data.relatedPosts.forEach((postSlug) => addEdge(`work:${work.slug}`, `blog:${postSlug}`, "related"));
    work.data.relatedWorks.forEach((workSlug) => addEdge(`work:${work.slug}`, `work:${workSlug}`, "related"));
  });
  worlds.forEach((entry) => {
    entry.data.relatedEntries.forEach((relatedSlug) => addEdge(`world:${entry.slug}`, `world:${relatedSlug}`, "related"));
  });

  const kinds: ContentGraphNodeKind[] = ["topic", "blog", "work", "world", "note", "link"];
  const counts = Object.fromEntries(kinds.map((kind) => [kind, nodes.filter((node) => node.kind === kind).length])) as Record<
    ContentGraphNodeKind,
    number
  >;

  return { nodes, edges, counts };
}
