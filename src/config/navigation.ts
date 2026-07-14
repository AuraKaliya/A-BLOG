export const mainNav = [
  { label: "入口", href: "/", match: "/" },
  { label: "文字", href: "/writings", match: "/writings" },
  { label: "作品", href: "/works", match: "/works" },
  { label: "世界", href: "/world", match: "/world" },
] as const;

export const aboutMenuLinks = [
  {
    title: "关于 Aura Kaliye",
    links: [
      { label: "个人介绍", href: "/about" },
      { label: "使用的署名", href: "/about#identity" },
      { label: "当前创作", href: "/about#focus" },
      { label: "现在", href: "/now" },
    ],
  },
  {
    title: "继续浏览",
    links: [
      { label: "随记", href: "/notes" },
      { label: "收藏", href: "/links" },
      { label: "主题", href: "/topics" },
      { label: "归档", href: "/archive" },
      { label: "RSS 订阅", href: "/rss.xml" },
    ],
  },
] as const;
