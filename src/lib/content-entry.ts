export type SluggedEntry<T extends { id: string }> = T & { slug: string };

export function contentSlug(id: string) {
  return id.replace(/\.(md|mdx|json|ya?ml|toml)$/i, "");
}

export function withSlug<T extends { id: string }>(entry: T): SluggedEntry<T> {
  return Object.assign(entry, { slug: contentSlug(entry.id) });
}
