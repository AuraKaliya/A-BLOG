# CMS Content Workflow

Editable page content now lives in Django `SitePage` records.

Public API:

```text
/api/pages/
/api/pages/home/
```

Seed local JSON page content into Django:

```powershell
npm run backend:seed-pages
python backend/manage.py seed_pages --key home
python backend/manage.py seed_pages --overwrite
```

Astro builds are deterministic by default: page snapshots read local `src/content/pages/*.json`, and resource-article snapshots read local `resource/article/*`. Runtime public pages are then hydrated from Django by `public/cms-live.js`.

If you intentionally want a static build to snapshot remote CMS content, opt in explicitly:

```powershell
$env:A_BLOG_BUILD_REMOTE_CONTENT = "1"
$env:A_BLOG_API_URL = "https://aurakaliye.com/api/"
npm run build
```

You can also scope the opt-in:

```powershell
$env:A_BLOG_BUILD_REMOTE_PAGES = "1"
$env:A_BLOG_BUILD_REMOTE_ARTICLES = "1"
```

The production backend container runs `migrate`, `seed_pages`, and `sync_articles` before starting Gunicorn. `seed_pages` only creates missing pages by default, so deployed JSON will not overwrite content already edited in Django Admin. Newly edited Django content appears publicly through live hydration without a frontend rebuild; static snapshots, RSS, sitemap, and OG metadata update on the next rebuild.

## Live public content

The public site includes `public/cms-live.js`, which hydrates selected static pages from Django at request time:

```text
/             -> /api/pages/home/
/writings/    -> /api/articles/ and /api/articles/tags/
/writings/:slug/ -> /api/articles/:slug/
```

The frontend nginx config falls back unknown `/writings/...` paths to `/writings/live/index.html`, so a newly published manual article can be opened immediately at `/writings/<slug>/` without a static rebuild.

Current live scope:

```text
Home page editable content
Article list, tags, view counts
Article detail title, summary, cover, metadata, tags, body HTML, TOC, previous/next links
```

Static rebuilds are still useful for SEO snapshots, RSS, sitemap, OG metadata, and non-live sections.

## HTML safety boundary

All article HTML entering the public article body must pass through the shared sanitizer:

```text
manual Markdown -> render_markdown -> sanitize_article_html -> Article.body_html
resource/article/*/index.html -> sync_articles -> sanitize_article_html -> Article.body_html
runtime API HTML -> cms-live.js client-side sanitizer -> DOM
local static snapshot -> src/lib/articles.ts sanitizer -> Astro set:html
```

The sanitizer strips scripts, event handlers, embedded active content, and unsafe URL schemes such as `javascript:` and `data:`. Resource HTML should still be treated as untrusted input until it has been synced and sanitized.
