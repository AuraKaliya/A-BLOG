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
  writings: {
    eyebrow: "Writings",
    title: "文字",
    description: "随笔、观察、片段记录与尚未完成的想法。",
    accent: "orange",
    meta: "Essays / Notes / Fragments",
  },
  tech: {
    eyebrow: "Tech",
    title: "技术",
    description: "开发笔记、工具链、教程、踩坑与实现记录。",
    accent: "cyan",
    meta: "Engineering / Tools / Practice",
  },
  world: {
    eyebrow: "World",
    title: "世界档案",
    description: "角色、地区、组织、事件、规则与术语构成的资料库。",
    accent: "green",
    meta: "Archive / Timeline / Relations",
  },
  changelog: {
    eyebrow: "Changelog",
    title: "更新记录",
    description: "网站版本、内容更新、设计调整与维护动作。",
    accent: "orange",
    meta: "Versions / Content / Maintenance",
  },
  notes: {
    eyebrow: "Signals",
    title: "短动态",
    description: "比文章更轻的状态、随想、分享与碎片记录。",
    accent: "orange",
    meta: "Thoughts / Status / Links / Fragments",
  },
  archive: {
    eyebrow: "Archive",
    title: "全站归档",
    description: "按时间统一浏览文章、作品、世界档案、短动态、推荐链接与更新记录。",
    accent: "cyan",
    meta: "Master Index / Timeline / Filters",
  },
  map: {
    eyebrow: "Constellation",
    title: "内容星图",
    description: "把主题关联、跨内容引用和站外信号展开成一张可以探索的关系图。",
    accent: "cyan",
    meta: "Topics / Relations / Discovery",
  },
  links: {
    eyebrow: "Signals",
    title: "站外信号",
    description: "友链、推荐阅读、工具、资料与持续提供灵感的站点。",
    accent: "green",
    meta: "Friends / Reading / Tools / References",
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
    description: "搜索文章、作品、主题、推荐链接、标签和技术栈。",
    accent: "cyan",
    meta: "Static Index / Search JSON",
  },
  topics: {
    eyebrow: "Topics",
    title: "主题地图",
    description: "把站内内容和站外信号按照长期关注方向重新组织。",
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
