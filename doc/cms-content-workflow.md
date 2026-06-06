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

Astro page queries read Django first and fall back to `src/content/pages/*.json` when the API is unavailable. During build, set `A_BLOG_API_URL` when the backend is not on the default local URL:

```powershell
$env:A_BLOG_API_URL = "https://aurakaliye.com/api/"
npm run build
```

The production backend container runs `migrate`, `seed_pages`, and `sync_articles` before starting Gunicorn. `seed_pages` only creates missing pages by default, so deployed JSON will not overwrite content already edited in Django Admin. Static frontend pages still need a rebuild/redeploy before newly edited Django page content appears publicly.

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
