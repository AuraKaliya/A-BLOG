import { expect, test } from "playwright/test";
import { readFileSync } from "node:fs";
import { mockUnavailableCmsApi } from "./helpers/cmsApi.mjs";

test.beforeEach(async ({ page }) => {
  await mockUnavailableCmsApi(page);
});

test("home prioritizes personal content and clear entrances", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('[data-home-screen="entry"]')).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Aura Kaliye" })).toBeVisible();
  await expect(page.locator(".profile-avatar img")).toHaveCount(0);
  await expect(page.locator("[data-home-profile-fallback]")).toHaveText("A");
  await expect(page.locator('[data-home-screen="entry"]').getByRole("heading", { name: "Dreath", exact: true })).toBeVisible();
  await expect(page.locator(".recent-status-image img")).toHaveAttribute("src", "/resource/default/default_image.png");
  await expect(page.getByRole("button", { name: "随机打开" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "阅读这条随记" })).toBeVisible();
  await expect(page.getByText("独立创作者")).toBeVisible();

  await expect(page.locator('[data-home-screen="intro"]')).toContainText("随记");
  await expect(page.locator('[data-home-screen="intro"]')).toContainText("现在");
  await expect(page.locator('[data-home-screen="intro"]')).toContainText("关于");

  await expect(page.locator('[data-home-screen="signals"]')).toHaveCount(0);
  await expect(page.locator(".home-update-item")).toHaveCount(0);
  await expect(page.getByText("网站更新时间轴")).toHaveCount(0);
  await expect(page.getByText("网站的运营数据")).toHaveCount(0);
  await expect(page.getByText("ICP备案号待填写")).toHaveCount(0);
  await expect(page.getByText("Your Name")).toHaveCount(0);
});

test("world archive keeps unfinished Dreath content private", async ({ page }) => {
  await page.goto("/world");

  await expect(page.getByRole("heading", { level: 1, name: "Dreath 世界档案" })).toBeVisible();
  await expect(page.locator(".world-card")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "还没有公开的 Dreath 档案" })).toBeVisible();
  await expect(page.getByText("临时观测站")).toHaveCount(0);

  await page.goto("/world/timeline");
  await expect(page.getByRole("heading", { name: "时间线上还没有公开事件" })).toBeVisible();
});

test("world archive does not expose empty filters", async ({ page }) => {
  await page.goto("/world");

  await expect(page.locator("[data-world-filter]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "随机进入一个条目" })).toHaveCount(0);
});

test("notes provide a distinct Dreath update and open its detail page", async ({ page }) => {
  await page.goto("/notes");

  await expect(page.locator(".note-card")).toHaveCount(1);
  await expect(page.locator(".note-card:not([hidden])")).toHaveCount(1);
  await page.getByRole("link", { name: "Dreath：先整理结构，再公开设定", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Dreath：先整理结构，再公开设定" })).toBeVisible();
});

test("links keep their route and show a formal empty state", async ({ page }) => {
  await page.goto("/links");

  await expect(page.locator(".link-card")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "还没有公开收藏" })).toBeVisible();
  await expect(page.getByText("友链交换信息")).toHaveCount(0);
});

test("topics keep their route and show a formal empty state", async ({ page }) => {
  await page.goto("/topics");

  await expect(page.getByRole("heading", { name: "还没有公开主题" })).toBeVisible();
  await expect(page.locator(".topic-tile")).toHaveCount(0);
});

test("archive unifies content types and keeps filter state", async ({ page }) => {
  await page.goto("/archive");

  await page.getByRole("button", { name: "随记 1" }).click();
  await expect(page).toHaveURL(/\/archive\/?\?type=note$/);
  await expect(page.locator("[data-archive-kind]:not([hidden])")).toHaveCount(1);
  expect(await page.evaluate(() => [...document.querySelectorAll('[data-archive-kind="blog"]')].every((item) => item.getBoundingClientRect().height === 0))).toBeTruthy();

  await page.reload();
  await expect(page.getByRole("button", { name: "随记 1" })).toHaveAttribute("aria-pressed", "true");
});

test("content map keeps its route and explains the empty relationship state", async ({ page }) => {
  await page.goto("/map");

  await expect(page.getByRole("heading", { name: "还没有可展示的内容关系" })).toBeVisible();
  await expect(page.locator("[data-graph-node]")).toHaveCount(0);
});

test("graph JSON exposes deterministic nodes and edges", async ({ request }) => {
  const response = await request.get("/graph.json");
  const graph = await response.json();

  expect(response.ok()).toBeTruthy();
  expect(graph.nodes).toHaveLength(1);
  expect(graph.edges).toHaveLength(0);
  expect(graph.counts).toEqual({ topic: 0, blog: 0, work: 0, world: 0, note: 1, link: 0 });
});

test("links JSON is empty and RSS only exposes real public content", async ({ request }) => {
  const linksResponse = await request.get("/links.json");
  const links = await linksResponse.json();
  expect(linksResponse.ok()).toBeTruthy();
  expect(links).toHaveLength(0);

  const rssResponse = await request.get("/rss.xml");
  const rss = await rssResponse.text();
  expect(rss).toContain("随记：Dreath：先整理结构，再公开设定");
  expect(rss).not.toContain("Astro Documentation");
});

test("search finds notes", async ({ page }) => {
  await page.goto("/search");

  await page.getByPlaceholder("输入关键词，例如 Dreath、创作、人物").fill("Dreath");
  await expect(page.getByRole("link", { name: "Dreath：先整理结构，再公开设定" })).toBeVisible();
});

test("about introduces Aura Kaliye without placeholder contact entries", async ({ page }) => {
  await page.goto("/about");

  await expect(page.getByRole("heading", { level: 1, name: "关于 Aura Kaliye" })).toBeVisible();
  await expect(page.getByText("我是 Aura Kaliye，目前主要投入幻想世界项目 Dreath 的创作。这里整理已经公开的创作近况与思考。")).toBeVisible();
  await expect(page.getByText("本站统一使用 Aura Kaliye；Aura、银花海和花海也是我使用的署名。")).toBeVisible();
  await expect(page.locator(".social-card")).toHaveCount(0);
  await expect(page.locator("#contact")).toHaveCount(0);
  await expect(page.getByText("your-name@example.com")).toHaveCount(0);
});

test("public pages do not expose template or implementation guidance", async ({ page }) => {
  const forbidden = [
    "适合放你的",
    "这个作品位",
    "category 为",
    "Pagefind",
    "后续可替换成真实更新流",
    "迭代轨道",
    "不用示例条目填满空白",
    "整理真实作品",
    "Your Name",
    "your-name@example.com",
    "ICP备案号待填写",
  ];

  for (const path of ["/about", "/now", "/lab", "/works", "/world", "/search"]) {
    await page.goto(path);
    const text = await page.locator("main").innerText();
    for (const phrase of forbidden) expect(text).not.toContain(phrase);
  }
});

test("empty public collections stay out of search indexing", async ({ page }) => {
  for (const path of ["/writings", "/works", "/world", "/links", "/topics", "/lab", "/map", "/changelog", "/world/timeline"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");
  }
});

test("legacy and incomplete routes have a deliberate public outcome", async ({ page }) => {
  await page.goto("/blog");
  await expect(page).toHaveURL(/\/writings\/?$/);

  await page.goto("/tech");
  await expect(page).toHaveURL(/\/writings\/?\?tag=%E6%8A%80%E6%9C%AF$/);

  await page.goto("/writings/live");
  await expect(page).toHaveURL(/\/writings\/?$/);

  await page.goto("/writings/live?slug=missing-preview");
  await expect(page.getByRole("heading", { name: "文章预览不可用" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,nofollow");
});

test("sitemap only exposes pages with meaningful public content", async () => {
  const sitemap = readFileSync("dist/sitemap-0.xml", "utf8");

  for (const path of ["about", "archive", "notes", "notes/first-open-signal", "now", "search"]) {
    expect(sitemap).toContain(`https://aurakaliye.com/${path}/`);
  }
  for (const path of ["blog", "changelog", "lab", "links", "map", "tech", "topics", "works", "world", "writings"]) {
    expect(sitemap).not.toContain(`https://aurakaliye.com/${path}/`);
  }
});

test("works use a clean empty state instead of template cards", async ({ page }) => {
  await page.goto("/works");

  await expect(page.locator(".work-card")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "还没有公开作品" })).toBeVisible();
  await expect(page.getByText("个人门户框架")).toHaveCount(0);
});

test("draft world entries do not expose dedicated OG images", async ({ request }) => {
  const response = await request.get("/og/world/temporary-observatory.svg");

  expect(response.ok()).toBeFalsy();
});

test("notes have dedicated OG images and join RSS", async ({ request }) => {
  const ogResponse = await request.get("/og/notes/first-open-signal.svg");
  expect(ogResponse.ok()).toBeTruthy();
  expect(await ogResponse.text()).toContain("Dreath：先整理结构，再公开设定");

  const rssResponse = await request.get("/rss.xml");
  expect(rssResponse.ok()).toBeTruthy();
  expect(await rssResponse.text()).toContain("随记：Dreath：先整理结构，再公开设定");
});

test("theme toggle persists the selected theme", async ({ page }) => {
  await page.goto("/");

  const toggle = page.getByRole("button", { name: /切换到/ });
  const initialTheme = await page.locator("html").getAttribute("data-theme");
  await toggle.click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", initialTheme);

  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", initialTheme);
});

test("mobile navigation exposes the main sections", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "切换导航" }).click();
  const navigation = page.getByRole("navigation", { name: "主导航" });
  await expect(navigation.getByRole("link", { name: "随记", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "现在", exact: true })).toBeVisible();
});

test("navigation only exposes populated sections and toggles the about menu by click", async ({ page }) => {
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "主导航" });
  await expect(navigation.getByRole("link", { name: "作品", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "世界", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "文字", exact: true })).toHaveCount(0);
  await expect(page.locator("#menu-works")).toHaveCount(0);

  const aboutTrigger = navigation.getByRole("button", { name: "关于" });
  await aboutTrigger.click();
  await expect(aboutTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#menu-about")).toBeVisible();

  await aboutTrigger.click();
  await expect(aboutTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#menu-about")).toBeHidden();
});

test("new discovery views do not overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of ["/", "/world?kind=event", "/notes?kind=status", "/links", "/archive?type=note", "/map", "/about", "/works"]) {
    await page.goto(path);
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(hasOverflow).toBeFalsy();
  }
});

test("the single public note uses a direct home action instead of fake randomness", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "阅读这条随记" }).click();
  await expect(page).toHaveURL(/\/notes\/first-open-signal\/?$/);
});
