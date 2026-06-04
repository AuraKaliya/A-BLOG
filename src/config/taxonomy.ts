export const blogCategoryKeys = ["engineering", "product", "reading", "review"] as const;

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
