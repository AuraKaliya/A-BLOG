import { expect, test } from "playwright/test";
import { hasTextQualityIssue } from "./helpers/textQuality.mjs";

test("home page hydrates editable CMS content", async ({ page }) => {
  await page.route("**/api/pages/home/**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        key: "home",
        title: "实时首页",
        description: "来自 CMS 的首页描述",
        updatedAt: "2026-06-06T12:00:00+08:00",
        data: {
          kind: "home",
          title: "实时首页",
          description: "来自 CMS 的首页描述",
          profile: {
            eyebrow: "Live Profile",
            name: "Live Aura",
            role: "CMS 编辑者",
            status: "正在验证实时内容",
            location: "测试环境",
            bio: "这段文字由 cms-live.js 注入。",
            imageIndex: "default/default_image",
            imageAlt: "实时头像",
            tags: ["CMS", "Live"],
            links: [{ label: "测试链接", href: "/about" }],
          },
          recentStatus: {
            eyebrow: "Live Status",
            title: "实时状态",
            description: "最近状态来自后端 API。",
            imageIndex: "default/default_image",
            imageAlt: "实时状态图",
            href: "/now",
          },
          randomExplore: {
            eyebrow: "Explore",
            title: "实时漫游",
            description: "按钮文案也来自 CMS。",
            actionLabel: "打开实时入口",
          },
          intro: {
            eyebrow: "About",
            title: "实时介绍",
            lead: "这是一段实时简介。",
            highlights: [
              { keyword: "文字", title: "实时文字", description: "来自 API 的入口", href: "/writings" },
              { keyword: "作品", title: "实时作品", description: "来自 API 的入口", href: "/works" },
            ],
          },
        },
      },
    });
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Live Aura" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "实时状态" })).toBeVisible();
  await expect(page.getByRole("button", { name: /打开实时入口/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "测试链接" })).toHaveAttribute("href", "/about");
  expect(hasTextQualityIssue(await page.locator("body").innerText())).toBeFalsy();
});

test("writings index hydrates live articles and tags", async ({ page }) => {
  await page.route("**/api/articles/views/**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { views: {} },
    });
  });
  await page.route("**/api/articles/tags/**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { items: [{ name: "CMS", slug: "cms", count: 1 }] },
    });
  });
  await page.route("**/api/articles/?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            slug: "live-article",
            title: "实时文章",
            summary: "这篇文章来自 CMS API。",
            cover: "/resource/default/default_image.png",
            category: "随笔",
            tags: ["CMS"],
            pubDate: "2026-06-06",
            updatedDate: null,
            featured: false,
            wordCount: 128,
            views: 7,
          },
        ],
      },
    });
  });

  await page.goto("/writings");

  await expect(page.getByRole("link", { name: "实时文章", exact: true })).toBeVisible();
  await expect(page.locator("[data-article-card]")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "CMS 1" })).toBeVisible();
  await expect(page.locator("[data-article-view-count='live-article']")).toHaveText("7");
  expect(hasTextQualityIssue(await page.locator("body").innerText())).toBeFalsy();
});

test("article detail hydrates live body, toc, metadata, and view count", async ({ page }) => {
  await page.route("**/api/articles/live-article/**", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/view/")) {
      await route.fulfill({
        contentType: "application/json",
        json: { slug: "live-article", views: 12, counted: true },
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      json: {
        slug: "live-article",
        title: "实时详情标题",
        summary: "详情页来自 CMS API。",
        cover: "/resource/default/default_image.png",
        category: "随笔",
        tags: ["CMS", "详情"],
        pubDate: "2026-06-06",
        updatedDate: "2026-06-06",
        featured: false,
        wordCount: 256,
        views: 11,
        html: '<h2 onclick="alert(1)">章节一</h2><p>正文由后端返回。</p><script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(1)">',
      },
    });
  });
  await page.route("**/api/articles/?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            slug: "live-article",
            title: "实时详情标题",
            summary: "详情页来自 CMS API。",
            cover: "/resource/default/default_image.png",
            category: "随笔",
            tags: ["CMS", "详情"],
            pubDate: "2026-06-06",
            updatedDate: "2026-06-06",
            featured: false,
            wordCount: 256,
            views: 11,
          },
        ],
      },
    });
  });

  await page.goto("/writings/live?slug=live-article");

  await expect(page.getByRole("heading", { level: 1, name: "实时详情标题" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "章节一" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "文章目录" })).toBeVisible();
  await expect(page.locator("[data-article-detail-views]")).toHaveText("12");
  await expect(page.locator(".article-html script")).toHaveCount(0);
  await expect(page.locator(".article-html h2")).not.toHaveAttribute("onclick", /.+/);
  await expect(page.locator(".article-html img")).not.toHaveAttribute("onerror", /.+/);
  await expect(page.locator(".article-html img")).not.toHaveAttribute("src", /javascript:/);
  expect(hasTextQualityIssue(await page.locator("body").innerText())).toBeFalsy();
});
