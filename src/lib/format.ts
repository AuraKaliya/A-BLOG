import type { BlogPost } from "./content";

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getReadingTime(post: BlogPost) {
  const text = (post.body ?? "").replace(/```[\s\S]*?```/g, "").replace(/[#>*_[\]()`-]/g, "");
  const cjkChars = text.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const words = text.replace(/[\u4e00-\u9fff]/g, " ").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil((cjkChars + words) / 500));
  return `${minutes} 分钟阅读`;
}

export function excerpt(text: string, length = 120) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= length) return normalized;
  return `${normalized.slice(0, length)}...`;
}
