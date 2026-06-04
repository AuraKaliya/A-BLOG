export interface PageInfo {
  currentPage: number;
  totalPages: number;
  basePath: string;
  previousPath?: string;
  nextPath?: string;
}

export function paginate<T>(items: T[], currentPage: number, pageSize: number, basePath: string) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: {
      currentPage: safePage,
      totalPages,
      basePath,
      previousPath: safePage > 1 ? pagePath(basePath, safePage - 1) : undefined,
      nextPath: safePage < totalPages ? pagePath(basePath, safePage + 1) : undefined,
    } satisfies PageInfo,
  };
}

export function pagePath(basePath: string, page: number) {
  if (page <= 1) return basePath;
  return `${basePath.replace(/\/$/, "")}/page/${page}`;
}
