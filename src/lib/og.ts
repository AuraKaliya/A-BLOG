import type { TopicEntry } from "./content-types";
import { blogCategoryLabels, workCategoryLabels } from "../config/taxonomy";
import { siteConfig } from "../config/site";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapLines(text: string, maxChars: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }

    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
}

export function renderOgImage(options: {
  eyebrow: string;
  title: string;
  description: string;
  accent?: "cyan" | "orange" | "green";
  meta?: string;
}) {
  const accent = options.accent ?? "cyan";
  const accentColor = {
    cyan: "#03ffff",
    orange: "#f46600",
    green: "#4fff00",
  }[accent];

  const titleLines = wrapLines(options.title, 18, 3);
  const descriptionLines = wrapLines(options.description, 34, 3);

  const titleMarkup = titleLines
    .map((line, index) => `<tspan x="72" dy="${index === 0 ? 0 : 58}">${escapeXml(line)}</tspan>`)
    .join("");
  const descriptionMarkup = descriptionLines
    .map((line, index) => `<tspan x="72" dy="${index === 0 ? 0 : 28}">${escapeXml(line)}</tspan>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0D1016"/>
      <stop offset="1" stop-color="#171C24"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="${accentColor}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.03"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" rx="32" fill="url(#bg)"/>
  <rect x="36" y="36" width="1128" height="558" rx="28" fill="url(#glow)" stroke="rgba(255,255,255,0.08)"/>
  <path d="M0 480L250 320L520 520L920 180L1200 420V630H0V480Z" fill="${accentColor}" fill-opacity="0.08"/>
  <circle cx="1024" cy="126" r="86" fill="${accentColor}" fill-opacity="0.12"/>
  <rect x="72" y="84" width="160" height="32" rx="16" fill="${accentColor}" fill-opacity="0.18"/>
  <text x="92" y="106" fill="#E7EBF2" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="2">${escapeXml(options.eyebrow.toUpperCase())}</text>
  <text x="72" y="220" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="54" font-weight="700">${titleMarkup}</text>
  <text x="72" y="408" fill="#B2B7C4" font-family="Arial, sans-serif" font-size="24" font-weight="500">${descriptionMarkup}</text>
  <text x="72" y="556" fill="${accentColor}" font-family="Arial, sans-serif" font-size="18" font-weight="700">${escapeXml(options.meta ?? siteConfig.title)}</text>
  <text x="1030" y="556" text-anchor="end" fill="#E7EBF2" font-family="Arial, sans-serif" font-size="18" font-weight="700">${escapeXml(siteConfig.name)}</text>
</svg>`;
}

export function blogOgMeta(category: keyof typeof blogCategoryLabels, tags: string[]) {
  return [blogCategoryLabels[category], ...tags].slice(0, 3).join(" / ");
}

export function workOgMeta(category: keyof typeof workCategoryLabels, techStack: string[]) {
  return [workCategoryLabels[category], ...techStack].slice(0, 3).join(" / ");
}

export function topicAccent(topic: TopicEntry) {
  return topic.data.accent;
}
