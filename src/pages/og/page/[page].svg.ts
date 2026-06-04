import { renderOgImage } from "../../../lib/og";

const pageMeta = {
  about: {
    eyebrow: "About",
    title: "关于",
    description: "个人介绍、关注方向、技术栈和联系方式。",
    accent: "orange",
    meta: "Identity / Focus / Contact",
  },
  blog: {
    eyebrow: "Blog",
    title: "博客归档",
    description: "技术笔记、产品观察、读书整理和阶段复盘的长期索引。",
    accent: "cyan",
    meta: "Categories / Series / Topics / Tags",
  },
  lab: {
    eyebrow: "Lab",
    title: "实验室",
    description: "AI 原型、交互 Demo、小工具和想法验证的归档入口。",
    accent: "green",
    meta: "Prototype / Workflow / Demo",
  },
  now: {
    eyebrow: "Now",
    title: "现在",
    description: "当前关注方向、站点状态和下一步迭代计划。",
    accent: "orange",
    meta: "Focus / Tracks / Updates",
  },
  search: {
    eyebrow: "Search",
    title: "站内搜索",
    description: "搜索文章、作品、主题、标签和技术栈。",
    accent: "cyan",
    meta: "Static Index / Search JSON",
  },
  topics: {
    eyebrow: "Topics",
    title: "主题地图",
    description: "把博客、作品和实验按照长期关注方向重新组织。",
    accent: "green",
    meta: "Cross-link / Taxonomy / Index",
  },
  works: {
    eyebrow: "Works",
    title: "作品归档",
    description: "项目、写作、工具、研究和实验的展示归档。",
    accent: "orange",
    meta: "Cases / Tools / Research / Experiments",
  },
} as const;

export function getStaticPaths() {
  return Object.keys(pageMeta).map((page) => ({ params: { page } }));
}

export function GET({ params }: { params: { page: keyof typeof pageMeta } }) {
  const data = pageMeta[params.page];

  return new Response(renderOgImage(data), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
