export const blogCategoryKeys = ["engineering", "product", "reading", "review"] as const;

export const blogSectionLabels = {
  writings: "文字",
  tech: "技术",
} as const;

export const blogCategoryLabels = {
  engineering: "技术笔记",
  product: "产品观察",
  reading: "读书整理",
  review: "阶段复盘",
} as const;

export const workCategoryLabels = {
  project: "项目",
  writing: "写作",
  tool: "工具",
  research: "研究",
  experiment: "实验",
} as const;

export const workStatusLabels = {
  concept: "构思中",
  building: "构建中",
  shipped: "已发布",
  archived: "已归档",
} as const;

export const workLinkKindLabels = {
  demo: "访问项目",
  source: "查看源码",
  article: "阅读记录",
  external: "外部链接",
} as const;

export const worldKindLabels = {
  character: "角色",
  location: "地区",
  organization: "组织",
  event: "事件",
  rule: "规则",
  term: "术语",
} as const;

export const worldStatusLabels = {
  seed: "待整理",
  organizing: "整理中",
  published: "已公开",
} as const;

export const changelogTypeLabels = {
  content: "内容更新",
  feature: "功能更新",
  design: "设计调整",
  maintenance: "维护记录",
} as const;

export const noteKindLabels = {
  thought: "随想",
  status: "状态",
  link: "分享",
  fragment: "碎片",
} as const;

export const linkKindLabels = {
  friend: "友链",
  reading: "阅读",
  tool: "工具",
  inspiration: "灵感",
  reference: "资料",
} as const;

export const archiveKindLabels = {
  blog: "文章",
  work: "作品",
  world: "世界档案",
  note: "短动态",
  link: "推荐链接",
  changelog: "更新记录",
} as const;

export const contentGraphKindLabels = {
  topic: "主题",
  blog: "文章",
  work: "作品",
  world: "世界档案",
  note: "短动态",
  link: "站外链接",
} as const;
