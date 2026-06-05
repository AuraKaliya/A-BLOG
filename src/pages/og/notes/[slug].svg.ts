import { noteKindLabels } from "../../../config/taxonomy";
import { getPublishedNotes } from "../../../lib/content";
import { renderOgImage } from "../../../lib/og";

export async function getStaticPaths() {
  const notes = await getPublishedNotes();
  return notes.map((note) => ({ params: { slug: note.slug }, props: { note } }));
}

export function GET({ props }: { props: { note: Awaited<ReturnType<typeof getPublishedNotes>>[number] } }) {
  const { note } = props;

  return new Response(
    renderOgImage({
      eyebrow: "Signal",
      title: note.data.title,
      description: note.data.description,
      accent: note.data.kind === "link" ? "cyan" : note.data.kind === "status" ? "green" : "orange",
      meta: [noteKindLabels[note.data.kind], ...note.data.tags].slice(0, 3).join(" / "),
    }),
    {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
