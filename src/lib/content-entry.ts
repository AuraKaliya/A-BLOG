import { readdirSync } from "node:fs";
import { extname, resolve } from "node:path";

export type SluggedEntry<T extends { id: string }> = T & { slug: string };

export function hasCollectionSource(collection: string, extensions: string[]) {
  const root = resolve(process.cwd(), "src", "content", collection);
  const allowed = new Set(extensions.map((extension) => extension.toLowerCase()));

  const visit = (directory: string): boolean => {
    try {
      return readdirSync(directory, { withFileTypes: true }).some((entry) => {
        if (entry.name.startsWith("_")) return false;
        return entry.isDirectory() ? visit(resolve(directory, entry.name)) : allowed.has(extname(entry.name).toLowerCase());
      });
    } catch {
      return false;
    }
  };

  return visit(root);
}

export function contentSlug(id: string) {
  return id.replace(/\.(md|mdx|json|ya?ml|toml)$/i, "");
}

export function withSlug<T extends { id: string }>(entry: T): SluggedEntry<T> {
  return Object.assign(entry, { slug: contentSlug(entry.id) });
}
