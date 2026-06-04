import { siteConfig } from "../config/site";

export function GET() {
  const sitemapUrl = new URL("/sitemap-index.xml", siteConfig.url).toString();

  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
