export const siteConfig = {
  name: "A-PORTAL",
  title: "Aura 的个人空间",
  tagline: "Personal archive",
  description: "一个保存文字、技术、作品、世界设定与未完成想法的个人内容宇宙入口。",
  url: "https://aurakaliye.com",
  locale: "zh-CN",
  author: {
    name: "Your Name",
    email: "your-name@example.com",
    github: "https://github.com/your-name",
    social: "https://example.com",
  },
  footerCapabilities: ["Astro 静态构建", "Markdown 内容集合", "跨内容更新流与搜索", "RSS 与 Sitemap"],
  footerLinks: [
    { label: "短动态", href: "/notes" },
    { label: "站外信号", href: "/links" },
    { label: "内容星图", href: "/map" },
    { label: "全站归档", href: "/archive" },
    { label: "搜索", href: "/search" },
    { label: "关于", href: "/about" },
  ],
  legal: {
    copyrightName: "Aura",
    icpFiling: "ICP备案号待填写",
    sitemap: "/sitemap-index.xml",
  },
};
