import { getPublishedPosts } from "../../../lib/content";
import { blogOgMeta, renderOgImage } from "../../../lib/og";

export async function getStaticPaths() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ params: { slug: post.slug }, props: post }));
}

export function GET({ props }: { props: Awaited<ReturnType<typeof getPublishedPosts>>[number] }) {
  const post = props;

  return new Response(
    renderOgImage({
      eyebrow: "Blog Post",
      title: post.data.title,
      description: post.data.description,
      accent: post.data.category === "product" ? "orange" : "cyan",
      meta: blogOgMeta(post.data.category, post.data.tags),
    }),
    {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
