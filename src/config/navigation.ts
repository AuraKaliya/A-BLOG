export const mainNav = [
  { label: "随记", href: "/notes", match: "/notes" },
  { label: "现在", href: "/now", match: "/now" },
] as const;

export const aboutMenuLinks = [
  {
    title: "关于我",
    links: [
      { label: "个人介绍", href: "/about" },
      { label: "创作方向", href: "/about#focus" },
      { label: "关于署名", href: "/about#identity" },
      { label: "现在", href: "/now" },
    ],
  },
  {
    title: "公开内容",
    links: [
      { label: "随记", href: "/notes" },
      { label: "归档", href: "/archive" },
      { label: "RSS 订阅", href: "/rss.xml" },
    ],
  },
] as const;
