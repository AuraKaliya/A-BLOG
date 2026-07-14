import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { siteConfig } from "./src/site.config.ts";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";

const resourceRoot = resolve("resource");
const hiddenFromSitemapPrefixes = [
  "/blog/",
  "/changelog/",
  "/lab/",
  "/links/",
  "/map/",
  "/tech/",
  "/topics/",
  "/works/",
  "/world/",
  "/world/timeline/",
  "/writings/",
  "/writings/live/",
];
const mimeTypes = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function serveResourceFile(req, res, next) {
  const pathname = req.url?.split("?")[0] ?? "";
  if (!pathname.startsWith("/resource/")) {
    next();
    return;
  }

  try {
    const relativePath = decodeURIComponent(pathname.replace(/^\/resource\/?/, ""));
    const filePath = resolve(resourceRoot, relativePath);
    if (!(filePath === resourceRoot || filePath.startsWith(`${resourceRoot}${sep}`))) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      next();
      return;
    }
    res.setHeader("Content-Type", mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream");
    createReadStream(filePath).pipe(res);
  } catch {
    next();
  }
}

function resourceServerPlugin() {
  return {
    name: "a-blog-resource-server",
    configureServer(server) {
      server.middlewares.use(serveResourceFile);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveResourceFile);
    },
  };
}

export default defineConfig({
  site: siteConfig.url,
  redirects: {
    "/blog": "/writings",
    "/tech": "/writings?tag=技术",
  },
  legacy: {
    collectionsBackwardsCompat: true,
  },
  integrations: [
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;
        return !hiddenFromSitemapPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
      },
    }),
  ],
  vite: {
    server: {
      proxy: {
        "/api": "http://127.0.0.1:8000",
      },
    },
    plugins: [resourceServerPlugin()],
  },
});
