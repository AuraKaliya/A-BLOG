import { getPublishedWorks } from "../../../lib/content";
import { renderOgImage, workOgMeta } from "../../../lib/og";

export async function getStaticPaths() {
  const works = await getPublishedWorks();
  return works.map((work) => ({ params: { slug: work.slug }, props: work }));
}

export function GET({ props }: { props: Awaited<ReturnType<typeof getPublishedWorks>>[number] }) {
  const work = props;

  return new Response(
    renderOgImage({
      eyebrow: "Work Entry",
      title: work.data.title,
      description: work.data.description,
      accent: work.data.category === "experiment" ? "green" : work.data.category === "project" ? "cyan" : "orange",
      meta: workOgMeta(work.data.category, work.data.techStack),
    }),
    {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
