import { expect, test } from "playwright/test";
import { mockUnavailableCmsApi } from "./helpers/cmsApi.mjs";

const rect = (element) => {
  const bounds = element.getBoundingClientRect();
  return {
    height: Math.round(bounds.height),
    width: Math.round(bounds.width),
  };
};

test.beforeEach(async ({ page }) => {
  await mockUnavailableCmsApi(page);
});

test("header controls keep stable geometry across responsive modes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const desktop = await page.evaluate(() => {
    const search = document.querySelector(".utility-chip");
    const label = search.querySelector("span");
    const icon = search.querySelector("svg");
    const box = (element) => {
      const bounds = element.getBoundingClientRect();
      return { height: Math.round(bounds.height), width: Math.round(bounds.width) };
    };
    return {
      icon: box(icon),
      label: box(label),
      search: box(search),
      utilityButtons: [...document.querySelectorAll(".utility-button")].map(box),
    };
  });

  expect(desktop.search.height).toBe(44);
  expect(desktop.search.width).toBeGreaterThan(80);
  expect(desktop.label.height).toBeLessThanOrEqual(20);
  expect(desktop.label.width).toBeGreaterThan(20);
  expect(desktop.icon).toEqual({ height: 20, width: 20 });
  expect(desktop.utilityButtons).toEqual([
    { height: 44, width: 44 },
    { height: 44, width: 44 },
  ]);

  await page.setViewportSize({ width: 1100, height: 900 });
  const medium = await page.evaluate(() => {
    const search = document.querySelector(".utility-chip");
    const bounds = search.getBoundingClientRect();
    return {
      height: Math.round(bounds.height),
      labelDisplay: getComputedStyle(search.querySelector("span")).display,
      width: Math.round(bounds.width),
    };
  });
  expect(medium).toEqual({ height: 44, labelDisplay: "none", width: 44 });

  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.locator(".mobile-toggle");
  await expect(toggle).toHaveCount(1);
  expect(await toggle.evaluate(rect)).toEqual({ height: 44, width: 44 });
  await toggle.click();

  const mobile = await page.evaluate(() => {
    const box = (element) => {
      const bounds = element.getBoundingClientRect();
      return { height: Math.round(bounds.height), width: Math.round(bounds.width) };
    };
    const actions = document.querySelector(".nav-actions");
    const nav = document.querySelector(".site-nav");
    const search = document.querySelector(".utility-chip");
    return {
      actions: box(actions),
      labelDisplay: getComputedStyle(search.querySelector("span")).display,
      links: [...nav.querySelectorAll(":scope > .nav-link")].map(box),
      nav: box(nav),
      search: box(search),
    };
  });

  expect(mobile.labelDisplay).not.toBe("none");
  expect(mobile.search.height).toBe(44);
  expect(mobile.search.width).toBe(mobile.actions.width);
  expect(mobile.search.width).toBeGreaterThan(300);
  expect(mobile.links.every((item) => item.width === mobile.nav.width)).toBeTruthy();
});

test("CMS command copy stays inside its mobile button", async ({ page }) => {
  const actionLabel = "打开一个文字更长但仍然保持清晰排版的随机内容入口";
  await page.route("**/api/pages/home/**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        data: {
          kind: "home",
          title: "按钮布局测试",
          randomExplore: { actionLabel },
        },
        title: "按钮布局测试",
      },
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const button = page.getByRole("button", { name: actionLabel });
  await expect(button).toBeVisible();

  const geometry = await button.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const parent = element.parentElement.getBoundingClientRect();
    return {
      height: Math.round(bounds.height),
      parentWidth: Math.round(parent.width),
      scrollWidth: element.scrollWidth,
      width: Math.round(bounds.width),
    };
  });
  expect(geometry.height).toBeGreaterThanOrEqual(52);
  expect(geometry.width).toBeLessThanOrEqual(geometry.parentWidth);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width);
});

test("long CMS tags are constrained without changing chip height", async ({ page }) => {
  const longTag = "这是一个用于验证超长动态标签不会撑破文章卡片和筛选栏的标签名称";
  await page.route("**/api/articles/views/**", async (route) => {
    await route.fulfill({ contentType: "application/json", json: { views: {} } });
  });
  await page.route("**/api/articles/tags/**", async (route) => {
    await route.fulfill({ contentType: "application/json", json: { items: [{ count: 1, name: longTag, slug: "long-tag" }] } });
  });
  await page.route("**/api/articles/?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        items: [{
          category: "随笔",
          cover: "/resource/default/default_image.png",
          featured: false,
          pubDate: "2026-07-14",
          slug: "long-tag-layout",
          summary: "验证动态标签按钮的布局约束。",
          tags: [longTag],
          title: "长标签布局测试",
          updatedDate: null,
          views: 0,
          wordCount: 128,
        }],
      },
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/writings");
  const chips = page.locator(`[title="${longTag}"]`);
  await expect(chips).toHaveCount(2);

  const geometry = await chips.evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();
    const parent = element.parentElement.getBoundingClientRect();
    return {
      height: Math.round(bounds.height),
      parentWidth: Math.round(parent.width),
      width: Math.round(bounds.width),
    };
  }));
  expect(geometry.every((item) => item.height === 34)).toBeTruthy();
  expect(geometry.every((item) => item.width <= item.parentWidth)).toBeTruthy();
});
