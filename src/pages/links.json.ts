import { linkKindLabels } from "../config/taxonomy";
import { getPublishedLinks } from "../lib/content";

export async function GET() {
  const links = await getPublishedLinks();

  return Response.json(
    links.map((entry) => ({
      id: entry.slug,
      title: entry.data.title,
      description: entry.data.description,
      note: entry.data.note,
      url: entry.data.url,
      feedUrl: entry.data.feedUrl,
      kind: entry.data.kind,
      kindLabel: linkKindLabels[entry.data.kind],
      language: entry.data.language,
      addedDate: entry.data.addedDate.toISOString(),
      updatedDate: entry.data.updatedDate?.toISOString(),
      featured: entry.data.featured,
      topics: entry.data.topics,
      tags: entry.data.tags,
    })),
  );
}
