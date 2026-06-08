import { expect, test } from "playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describeTextQualityIssue, hasTextQualityIssue } from "./helpers/textQuality.mjs";

const textExtensions = new Set([
  ".astro",
  ".bat",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ps1",
  ".py",
  ".sh",
  ".ts",
  ".txt",
  ".yml",
]);

const ignoredDirectories = new Set([
  ".astro",
  ".git",
  "backend/.venv",
  "backend/staticfiles",
  "dist",
  "node_modules",
  "output",
  "playwright-report",
  "test-results",
]);

const ignoredFiles = new Set(["package-lock.json", "resource-tools/resource-manifest.json", "test/helpers/textQuality.mjs"]);

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

function isIgnored(path) {
  const normalized = normalizePath(path);
  return ignoredDirectories.has(normalized) || ignoredFiles.has(normalized);
}

function collectTextFiles(root = ".") {
  const files = [];

  function walk(current) {
    const normalized = normalizePath(relative(root, current) || ".");
    if (normalized !== "." && isIgnored(normalized)) return;

    for (const entry of readdirSync(current)) {
      const fullPath = join(current, entry);
      const relativePath = normalizePath(relative(root, fullPath));
      if (isIgnored(relativePath)) continue;

      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        walk(fullPath);
      } else if (textExtensions.has(extname(entry))) {
        files.push(fullPath);
      }
    }
  }

  walk(root);
  return files;
}

test("source text is valid UTF-8 and free of mojibake sentinels", async () => {
  const offenders = [];

  for (const file of collectTextFiles()) {
    const relativePath = normalizePath(relative(".", file));
    const text = readFileSync(file, "utf8");
    text.split(/\r?\n/).forEach((line, index) => {
      if (hasTextQualityIssue(line)) {
        offenders.push(`${relativePath}:${index + 1}: ${describeTextQualityIssue(line)} in ${line.trim()}`);
      }
    });
  }

  expect(offenders).toEqual([]);
});
