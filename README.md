# A-BLOG

A-BLOG is a personal content site built with Astro, a small Django API/CMS, Playwright tests, and Docker deployment tooling.

## Project Shape

- `src/`: Astro pages, layouts, components, content schemas, and static-content queries.
- `src/content/`: Markdown and JSON content collections for blog posts, works, world entries, notes, links, topics, and editable page fallbacks.
- `public/`: Browser scripts for global site interactions, search, and live CMS hydration.
- `backend/`: Django API, console views, article sync, page seeding, and backend tests.
- `resource/`: Local runtime resource files served at `/resource/`.
- `test/`: Playwright workflow, CMS live, text hygiene, and visual smoke tests.
- `doc/`: Operations, CMS workflow, and testing notes.
- `docker-tools/`: Local and production Docker release tooling.
- `resource-tools/`: Resource import, promotion, manifest, and sync utility.

## Local Development

```powershell
npm install
npm run dev
```

The Astro dev server runs at `http://127.0.0.1:4321`.

For the Django backend:

```powershell
python -m pip install -r backend/requirements.txt
npm run backend:migrate
npm run backend:seed-pages
npm run backend:sync
npm run backend:dev
```

The backend runs at `http://127.0.0.1:8000`, and Astro proxies `/api` requests to it in development.

## Test Gate

Run the full gate before release-oriented work:

```powershell
npm run test:all
```

This runs:

- `npm run build`
- `npm test`
- `npm run backend:test`

Useful focused commands:

```powershell
npm run build
npm test
npm run backend:test
npx playwright test test/cms-live.spec.mjs --reporter=line --workers=1
npx playwright test test/visual-smoke.spec.mjs --reporter=line --workers=1
```

Visual smoke screenshots are written under `test-results/`.

## Content Workflow

Static content is stored in `src/content`. Editable page content and live article data can also be served by Django. See:

- [CMS content workflow](doc/cms-content-workflow.md)
- [Testing plan](doc/testing-plan.md)
- [Operations manual](doc/ops-manual.md)

## Deployment

Docker release tooling lives under `docker-tools/`.

```powershell
.\docker-tools\build-release.ps1 -NoUpload
```

See [Docker deployment](docker-tools/README.md) for local Docker testing, release package generation, and production update steps.
