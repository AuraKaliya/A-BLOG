import { renderOgImage } from "../../../lib/og";

const pageMeta = {
  about: {
    eyebrow: "关于",
    title: "关于 Aura Kaliye",
    description: "使用的署名、当前创作与这个个人空间。",
    accent: "orange",
    meta: "署名 / 创作 / 个人空间",
  },
  blog: {
    eyebrow: "博客",
    title: "博客归档",
    description: "技术笔记、产品观察、读书整理和阶段复盘的长期索引。",
    accent: "cyan",
    meta: "分类 / 系列 / 主题 / 标签",
  },
  writings: {
    eyebrow: "文字",
    title: "文字",
    description: "随笔、创作笔记与技术实践。",
    accent: "orange",
    meta: "随笔 / 笔记 / 实践",
  },
  tech: {
    eyebrow: "技术",
    title: "技术",
    description: "开发笔记、工具链、教程、踩坑与实现记录。",
    accent: "cyan",
    meta: "开发 / 工具 / 实践",
  },
  world: {
    eyebrow: "世界",
    title: "Dreath 世界档案",
    description: "Dreath 的人物、地点、组织、事件、规则与术语。",
    accent: "green",
    meta: "档案 / 时间线 / 关系",
  },
  changelog: {
    eyebrow: "更新记录",
    title: "更新记录",
    description: "网站版本、内容更新、设计调整与维护动作。",
    accent: "orange",
    meta: "版本 / 内容 / 维护",
  },
  notes: {
    eyebrow: "随记",
    title: "随记",
    description: "比文章更短的状态与想法。",
    accent: "orange",
    meta: "想法 / 状态 / 分享",
  },
  archive: {
    eyebrow: "归档",
    title: "归档",
    description: "按时间浏览文章、作品、世界档案、随记、收藏与网站更新。",
    accent: "cyan",
    meta: "时间 / 内容 / 筛选",
  },
  map: {
    eyebrow: "内容关系",
    title: "内容关系",
    description: "查看文章、随记、收藏与主题之间的直接关联。",
    accent: "cyan",
    meta: "主题 / 关系 / 浏览",
  },
  links: {
    eyebrow: "收藏",
    title: "收藏",
    description: "友链、推荐阅读、工具、资料与持续提供灵感的站点。",
    accent: "green",
    meta: "友链 / 阅读 / 工具 / 资料",
  },
  lab: {
    eyebrow: "实验室",
    title: "实验室",
    description: "用于展示原型、工具与交互实验。",
    accent: "green",
    meta: "原型 / 工具 / 交互",
  },
  now: {
    eyebrow: "现在",
    title: "现在",
    description: "Aura Kaliye 最近的创作重点。",
    accent: "orange",
    meta: "状态 / 进度 / 更新",
  },
  search: {
    eyebrow: "搜索",
    title: "站内搜索",
    description: "搜索文章、作品、世界档案、随记、收藏和主题。",
    accent: "cyan",
    meta: "内容索引 / 站内检索",
  },
  topics: {
    eyebrow: "主题",
    title: "主题",
    description: "按照长期关注方向重新浏览公开内容。",
    accent: "green",
    meta: "关联 / 分类 / 索引",
  },
  works: {
    eyebrow: "作品",
    title: "作品归档",
    description: "公开展示的项目、工具与创作。",
    accent: "orange",
    meta: "项目 / 工具 / 创作 / 实验",
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
