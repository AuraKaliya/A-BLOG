import { renderOgImage } from "../../lib/og";
import { siteConfig } from "../../config/site";

export function GET() {
  return new Response(
    renderOgImage({
      eyebrow: "Portal",
      title: siteConfig.title,
      description: siteConfig.description,
      accent: "cyan",
      meta: "Blog / Works / Topics / Lab",
    }),
    {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
