import { getPublishedWorldEntries } from "../../../lib/content";
import { renderOgImage, worldOgMeta } from "../../../lib/og";

export async function getStaticPaths() {
  const entries = await getPublishedWorldEntries();
  return entries.map((entry) => ({ params: { slug: entry.slug }, props: entry }));
}

export function GET({ props }: { props: Awaited<ReturnType<typeof getPublishedWorldEntries>>[number] }) {
  const entry = props;
  const accent = entry.data.kind === "event" ? "orange" : entry.data.kind === "rule" ? "cyan" : "green";

  return new Response(
    renderOgImage({
      eyebrow: `World / ${entry.data.kind}`,
      title: entry.data.title,
      description: entry.data.description,
      accent,
      meta: worldOgMeta(entry.data.kind, entry.data.status, entry.data.tags),
    }),
    {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
