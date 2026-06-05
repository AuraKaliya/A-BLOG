export const mainNav = [
  { label: "入口", href: "/", match: "/" },
  { label: "文字", href: "/writings", match: "/writings" },
  { label: "技术", href: "/tech", match: "/tech" },
  { label: "作品", href: "/works", match: "/works", menu: "works" },
  { label: "世界", href: "/world", match: "/world" },
] as const;

export const portfolioMenuGroups = [
  {
    id: "projects",
    label: "项目",
    description: "完整度较高、可以长期展示的作品。",
    cards: [
      { title: "个人门户框架", text: "博客、作品和实验统一入口。", items: ["Astro", "内容集合", "展示系统"] },
      { title: "知识笔记系统", text: "把长期学习沉淀成公开索引。", items: ["写作", "归档", "主题页"] },
      { title: "小工具合集", text: "面向效率和创作的轻量工具。", items: ["自动化", "原型", "脚本"] },
      { title: "研究备忘录", text: "记录技术选型和产品判断。", items: ["调研", "分析", "复盘"] },
    ],
  },
  {
    id: "writing",
    label: "写作",
    description: "围绕技术、产品和个人思考的文章系列。",
    cards: [
      { title: "技术笔记", text: "框架、工程实践和调试记录。", items: ["前端", "AI", "工具链"] },
      { title: "产品观察", text: "关于体验、结构和系统设计。", items: ["设计", "策略", "增长"] },
      { title: "阅读整理", text: "把读到的内容变成可复用观点。", items: ["摘录", "书评", "主题"] },
      { title: "个人日志", text: "保留一些阶段性的判断和复盘。", items: ["计划", "总结", "生活"] },
    ],
  },
  {
    id: "experiments",
    label: "实验",
    description: "不一定完整，但能展示方向和动手能力。",
    cards: [
      { title: "AI 原型", text: "提示词、Agent 和生成式应用尝试。", items: ["LLM", "工作流", "演示"] },
      { title: "交互 Demo", text: "可视化、动画和前端小实验。", items: ["Canvas", "SVG", "动效"] },
      { title: "数据探索", text: "把数据整理成可读的图表或页面。", items: ["图表", "指标", "洞察"] },
      { title: "未完成想法", text: "保留还在打磨中的概念。", items: ["草稿", "假设", "验证"] },
    ],
  },
] as const;

export const aboutMenuLinks = [
  {
    title: "个人档案",
    links: [
      { label: "我是谁", href: "/about" },
      { label: "关注方向", href: "/about#focus" },
      { label: "技术栈", href: "/about#stack" },
      { label: "联系方式", href: "/about#contact" },
      { label: "社交入口", href: "/about#socials" },
    ],
  },
  {
    title: "次级入口",
    links: [
      { label: "主题地图", href: "/topics" },
      { label: "内容星图", href: "/map" },
      { label: "实验室", href: "/lab" },
      { label: "当前状态", href: "/now" },
      { label: "短动态", href: "/notes" },
      { label: "站外信号", href: "/links" },
      { label: "更新记录", href: "/changelog" },
      { label: "全站归档", href: "/archive" },
      { label: "全部文章", href: "/blog" },
      { label: "RSS 订阅", href: "/rss.xml" },
    ],
  },
] as const;
