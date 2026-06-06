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
