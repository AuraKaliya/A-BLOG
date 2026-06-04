export const resourceConfig = {
  publicPath: "/resource",
  testDirectory: "test-resource",
  releaseDirectory: "resource",
} as const;

export function resourcePath(path: string) {
  const cleanPath = path
    .replace(/^\/?resource\//, "")
    .replace(/^\/+/, "");

  return `${resourceConfig.publicPath}/${cleanPath}`;
}

export function isManagedResourcePath(path: string) {
  return path.startsWith(`${resourceConfig.publicPath}/`);
}
