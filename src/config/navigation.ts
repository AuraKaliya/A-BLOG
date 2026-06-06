export const mainNav = [
  { label: "入口", href: "/", match: "/" },
  { label: "文字", href: "/writings", match: "/writings" },
  { label: "作品", href: "/works", match: "/works" },
  { label: "世界", href: "/world", match: "/world" },
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
      { label: "全部文字", href: "/writings" },
      { label: "RSS 订阅", href: "/rss.xml" },
    ],
  },
] as const;
