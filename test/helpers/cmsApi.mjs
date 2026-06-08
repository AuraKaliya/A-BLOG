export async function mockUnavailableCmsApi(page) {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 503,
      json: { detail: "CMS API unavailable in this test." },
    });
  });
}
