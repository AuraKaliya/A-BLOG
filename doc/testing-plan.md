# A-BLOG Testing Plan

This project uses three test layers: Astro build checks, Playwright browser tests, and Django backend tests.

## Commands

```powershell
npm run build
npm test
npm run backend:test
npm run test:all
```

`npm test` runs the Playwright suite, including:

- Site workflow tests for navigation, filters, search, RSS, JSON, OG images, theme persistence, and mobile overflow.
- CMS live hydration tests for the home page, writings index, and article detail page.
- Source text hygiene checks for invalid UTF-8 replacement characters and common mojibake sentinels.
- Visual smoke tests that open key desktop and mobile routes, check for broken images, horizontal overflow, visible `main` content, and text-quality issues, then save screenshots under `test-results/`.

`npm run backend:test` runs Django tests for:

- Article resource parsing and relative asset rewriting.
- Path traversal protection for article assets.
- `sync_articles` and `seed_pages` management commands.
- Public API behavior for pages, article lists/details, tags, view counts, draft visibility, and one-view-per-visitor-per-day counting.

## Codex Visual QA

For UI changes, use this order:

1. Run `npm test` so Playwright generates deterministic desktop and mobile screenshots.
2. Inspect key screenshots from `test-results/` with Codex image viewing.
3. If the in-app Browser is available, open `http://127.0.0.1:4321` and verify the same routes interactively.

Recommended visual sample:

```text
/
/writings
/map
/search
/works
/archive
```

Check for visible mojibake, clipped Chinese text, card or toolbar overlap, broken images, unexpected horizontal scrolling, inaccessible mobile navigation, and unreadable light/dark contrast.
