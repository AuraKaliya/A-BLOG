import { expect, test } from "playwright/test";

test("home exposes the content universe entrances", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('[data-home-screen="entry"]')).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Aura Kaliye" })).toBeVisible();
  await expect(page.locator(".profile-avatar img")).toHaveAttribute("src", "/resource/default/default_image.png");
  await expect(page.getByRole("heading", { name: "近期状态" })).toBeVisible();
  await expect(page.locator(".recent-status-image img")).toHaveAttribute("src", "/resource/default/default_image.png");
  await expect(page.getByRole("button", { name: "开始漫游" })).toBeVisible();

  await expect(page.locator('[data-home-screen="intro"]')).toContainText("文字");
  await expect(page.locator('[data-home-screen="intro"]')).toContainText("作品");
  await expect(page.locator('[data-home-screen="intro"]')).toContainText("世界");

  await expect(page.getByRole("heading", { name: "最新动态" })).toBeVisible();
  await expect(page.locator(".home-update-item")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "网站更新时间轴" })).toBeVisible();
  await expect(page.locator(".home-timeline-item")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "网站的运营数据" })).toBeVisible();
  await expect(page.locator(".home-stat-item")).toHaveCount(6);
  await expect(page.getByText("ICP备案号待填写")).toBeVisible();
});

test("world archive, detail, and timeline are connected", async ({ page }) => {
  await page.goto("/world");

  await expect(page.getByRole("heading", { level: 1, name: "世界档案" })).toBeVisible();
  await expect(page.locator(".world-card")).toHaveCount(3);

  await page.getByRole("link", { name: "临时观测站" }).click();
  await expect(page).toHaveURL(/\/world\/temporary-observatory\/?$/);
  await expect(page.getByRole("heading", { level: 2, name: "关联档案" })).toBeVisible();

  await page.goto("/world/timeline");
  await expect(page.getByRole("link", { name: "第一次公开信号" })).toBeVisible();
});

test("world archive filters by kind and keeps the URL state", async ({ page }) => {
  await page.goto("/world");

  await page.getByRole("button", { name: "事件 1" }).click();
  await expect(page).toHaveURL(/\/world\/?\?kind=event$/);
  await expect(page.locator("[data-world-kind-section]:not([hidden])")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "第一次公开信号" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "事件 1" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-world-kind-section]:not([hidden])")).toHaveCount(1);
});

test("search finds world entries", async ({ page }) => {
  await page.goto("/search");

  await page.getByPlaceholder("输入关键词，例如 Astro、作品、AI").fill("观测站");
  await expect(page.getByRole("link", { name: "临时观测站" })).toBeVisible();
});

test("notes filter by kind and open a detail page", async ({ page }) => {
  await page.goto("/notes");

  await expect(page.locator(".note-card")).toHaveCount(3);
  await page.getByRole("button", { name: "分享 1" }).click();
  await expect(page).toHaveURL(/\/notes\/?\?kind=link$/);
  await expect(page.locator(".note-card:not([hidden])")).toHaveCount(1);
  await expect(page.locator('[data-note-kind="status"]')).toBeHidden();
  await expect(page.locator('[data-note-kind="link"]')).toBeVisible();
  await page.getByRole("link", { name: "静态内容也能保持活性" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "静态内容也能保持活性" })).toBeVisible();
});

test("external signals filter by kind and expose curated destinations", async ({ page }) => {
  await page.goto("/links");

  await expect(page.locator(".link-card")).toHaveCount(5);
  await page.getByRole("button", { name: "资料 2" }).click();
  await expect(page).toHaveURL(/\/links\/?\?kind=reference$/);
  await expect(page.locator(".link-card:not([hidden])")).toHaveCount(2);
  await expect(page.locator('[data-link-kind="tool"]')).toBeHidden();
  await expect(page.getByRole("link", { name: "Astro Documentation" })).toHaveAttribute("target", "_blank");

  await page.reload();
  await expect(page.getByRole("button", { name: "资料 2" })).toHaveAttribute("aria-pressed", "true");
});

test("topic map includes external signals without duplicate anchors", async ({ page }) => {
  await page.goto("/topics");

  await expect(page.locator(".link-card")).toHaveCount(6);
  const duplicateIds = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map((item) => item.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  });
  expect(duplicateIds).toEqual([]);
});

test("archive unifies content types and keeps filter state", async ({ page }) => {
  await page.goto("/archive");

  await page.getByRole("button", { name: "短动态 3" }).click();
  await expect(page).toHaveURL(/\/archive\/?\?type=note$/);
  await expect(page.locator("[data-archive-kind]:not([hidden])")).toHaveCount(3);
  expect(await page.evaluate(() => [...document.querySelectorAll('[data-archive-kind="blog"]')].every((item) => item.getBoundingClientRect().height === 0))).toBeTruthy();

  await page.reload();
  await expect(page.getByRole("button", { name: "短动态 3" })).toHaveAttribute("aria-pressed", "true");
});

test("content map exposes and filters the relationship graph", async ({ page }) => {
  await page.goto("/map");

  await expect(page.locator("[data-graph-node]")).toHaveCount(19);
  await expect(page.locator("[data-graph-edge]")).toHaveCount(30);
  await page.getByRole("button", { name: "作品 3" }).click();
  await expect(page).toHaveURL(/\/map\/?\?type=work$/);
  await expect(page.locator("[data-graph-node]:not([hidden])")).toHaveCount(6);
  await expect(page.locator("[data-graph-edge]:not([hidden])")).toHaveCount(7);
  await expect(page.locator('[data-graph-node-kind="blog"]:not([hidden])')).toHaveCount(0);
  await expect(page.locator('[data-graph-node-kind="work"]:not([hidden])')).toHaveCount(3);

  await page.reload();
  await expect(page.getByRole("button", { name: "作品 3" })).toHaveAttribute("aria-pressed", "true");
});

test("graph JSON exposes deterministic nodes and edges", async ({ request }) => {
  const response = await request.get("/graph.json");
  const graph = await response.json();

  expect(response.ok()).toBeTruthy();
  expect(graph.nodes).toHaveLength(19);
  expect(graph.edges).toHaveLength(30);
  expect(graph.counts).toEqual({ topic: 3, blog: 2, work: 3, world: 3, note: 3, link: 5 });
});

test("links JSON and RSS expose curated external signals", async ({ request }) => {
  const linksResponse = await request.get("/links.json");
  const links = await linksResponse.json();
  expect(linksResponse.ok()).toBeTruthy();
  expect(links).toHaveLength(5);
  expect(links.find((entry) => entry.id === "a-list-apart").feedUrl).toContain("alistapart.com");

  const rssResponse = await request.get("/rss.xml");
  expect(await rssResponse.text()).toContain("推荐：Astro Documentation");
});

test("search finds external signals", async ({ page }) => {
  await page.goto("/search?type=link&q=MDN");

  await expect(page.getByRole("link", { name: "MDN Web Docs" })).toBeVisible();
  await expect(page.getByRole("button", { name: "推荐链接" })).toHaveClass(/active/);
});

test("search finds notes", async ({ page }) => {
  await page.goto("/search");

  await page.getByPlaceholder("输入关键词，例如 Astro、作品、AI").fill("未完成的想法");
  await expect(page.getByRole("link", { name: "未完成的想法也需要入口" })).toBeVisible();
});

test("about exposes configured social entries", async ({ page }) => {
  await page.goto("/about");

  await expect(page.locator(".social-card")).toHaveCount(3);
  await expect(page.getByRole("link", { name: /GitHub/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /站点订阅/ })).toBeVisible();
});

test("works expose typed project links", async ({ page }) => {
  await page.goto("/works");

  await expect(page.getByRole("link", { name: "访问项目", exact: true })).toBeVisible();
  await page.goto("/works/blog-portal");
  await expect(page.getByRole("link", { name: /阅读开发记录/ })).toBeVisible();
});

test("world entries have dedicated OG images", async ({ request }) => {
  const response = await request.get("/og/world/temporary-observatory.svg");

  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
  expect(await response.text()).toContain("临时观测站");
});

test("notes have dedicated OG images and join RSS", async ({ request }) => {
  const ogResponse = await request.get("/og/notes/first-open-signal.svg");
  expect(ogResponse.ok()).toBeTruthy();
  expect(await ogResponse.text()).toContain("第一条公开动态");

  const rssResponse = await request.get("/rss.xml");
  expect(rssResponse.ok()).toBeTruthy();
  expect(await rssResponse.text()).toContain("短动态：第一条公开动态");
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
  await expect(navigation.getByRole("link", { name: "文字", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "世界", exact: true })).toBeVisible();
});

test("navigation keeps works direct and toggles the about menu by click", async ({ page }) => {
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "主导航" });
  await expect(navigation.getByRole("link", { name: "作品", exact: true })).toHaveAttribute("href", "/works");
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

  for (const path of ["/", "/world?kind=event", "/notes?kind=link", "/links?kind=reference", "/archive?type=note", "/map?type=world", "/about#socials", "/works"]) {
    await page.goto(path);
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(hasOverflow).toBeFalsy();
  }
});

test("random exploration leaves the current page", async ({ page }) => {
  await page.goto("/world");

  await page.getByRole("button", { name: "随机进入一个条目" }).click();
  await expect(page).not.toHaveURL(/\/world\/?$/);
});
