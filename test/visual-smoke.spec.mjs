import { expect, test } from "playwright/test";
import { mockUnavailableCmsApi } from "./helpers/cmsApi.mjs";
import { hasTextQualityIssue } from "./helpers/textQuality.mjs";

const desktopRoutes = ["/", "/writings", "/map", "/search", "/works"];
const mobileRoutes = ["/", "/writings", "/archive", "/map?type=world"];

test.beforeEach(async ({ page }) => {
  await mockUnavailableCmsApi(page);
});

async function collectPageHealth(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    const brokenImages = [...document.images]
      .filter((image) => image.currentSrc && image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc);
    return {
      bodyText: document.body.innerText,
      brokenImages,
      hasMain: Boolean(main && main.getBoundingClientRect().height > 0),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
}

for (const route of desktopRoutes) {
  test(`desktop visual smoke: ${route}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(route);

    const health = await collectPageHealth(page);
    expect(health.hasMain).toBeTruthy();
    expect(health.overflow).toBeFalsy();
    expect(health.brokenImages).toEqual([]);
    expect(hasTextQualityIssue(health.bodyText)).toBeFalsy();
    await page.screenshot({ path: testInfo.outputPath(`desktop-${route.replace(/[^a-z0-9]+/gi, "-") || "home"}.png`), fullPage: true });
  });
}

for (const route of mobileRoutes) {
  test(`mobile visual smoke: ${route}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);

    const health = await collectPageHealth(page);
    expect(health.hasMain).toBeTruthy();
    expect(health.overflow).toBeFalsy();
    expect(health.brokenImages).toEqual([]);
    expect(hasTextQualityIssue(health.bodyText)).toBeFalsy();
    await page.screenshot({ path: testInfo.outputPath(`mobile-${route.replace(/[^a-z0-9]+/gi, "-") || "home"}.png`), fullPage: true });
  });
}
