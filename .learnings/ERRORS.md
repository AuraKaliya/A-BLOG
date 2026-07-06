# Errors

## 2026-06-03 - Windows Start-Process with npm shim

- **Context:** Starting an Astro dev server from PowerShell with `Start-Process -FilePath npm`.
- **Error:** `%1 不是有效的 Win32 应用程序。`
- **Cause:** On Windows, `npm` resolves to a command shim that `Start-Process` may not launch directly.
- **Resolution:** Use `npm.cmd` as the `Start-Process -FilePath` target.

## 2026-06-03 - Playwright CLI missing browser

- **Context:** Capturing screenshots with `npx playwright screenshot`.
- **Error:** Chromium executable was missing under `ms-playwright`.
- **Cause:** Playwright CLI package was available, but the browser binaries had not been installed yet.
- **Resolution:** Run `npx playwright install chromium` before screenshot-based QA.

## 2026-06-03 - npx temporary Playwright package not importable from stdin

- **Context:** Running a Playwright interaction script through PowerShell stdin with `npx -p playwright node`.
- **Error:** `Cannot find module 'playwright'`.
- **Cause:** The temporary package was not added to the module resolution path for the stdin Node process.
- **Resolution:** Add `playwright` as a project dev dependency when scripted browser QA is needed.
## [ERR-20260604-001] powershell_rg_quoting

**Logged**: 2026-06-04T09:58:00+08:00
**Priority**: low
**Status**: pending
**Area**: config

### Summary
PowerShell parsed an `rg` pattern containing nested double quotes as syntax instead of passing it through.

### Error
```text
ParserError: Missing property name after reference operator.
```

### Context
- Command attempted: `rg "from \".*site.config\"" src`
- Environment: PowerShell on Windows

### Suggested Fix
Use single-quoted PowerShell strings for regex patterns that contain double quotes, or escape quotes with PowerShell-compatible syntax.

### Metadata
- Reproducible: yes
- Related Files: none

---

## [ERR-20260706-001] powershell_literal_bracket_path

**Logged**: 2026-07-06T16:26:00+08:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
PowerShell treats square brackets in paths such as `src\pages\writings\[slug].astro` as wildcard character classes.

### Error
```text
An object at the specified path src\pages\writings\[slug].astro does not exist, or has been filtered by the -Include or -Exclude parameter.
```

### Context
- Attempted to read an Astro route file whose file name contains `[slug]`.
- Environment: PowerShell on Windows.

### Suggested Fix
Use `Get-Content -LiteralPath` or other `-LiteralPath` aware cmdlets for bracketed route files.

### Metadata
- Reproducible: yes
- Related Files: src/pages/writings/[slug].astro

---

## [ERR-20260706-002] astro7_content_entry_id_migration

**Logged**: 2026-07-06T16:26:00+08:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
After upgrading to Astro 7, content entries expose `id` instead of the legacy `slug`, and data collection IDs can include `.json`.

### Error
```text
Property 'slug' does not exist on type CollectionEntry<...>
Missing page content entry: about; available: about.json, home.json, lab.json, now.json
```

### Context
- `npm audit fix --force` upgraded Astro to 7.0.6.
- The project still had many callers expecting `entry.slug`.

### Suggested Fix
Use a compatibility helper that maps `entry.id` to extensionless `slug`, and normalize data collection IDs when looking up local JSON entries. Plan a later migration from `slug` call sites to `id`.

### Metadata
- Reproducible: yes
- Related Files: src/lib/content-entry.ts, src/lib/queries/pages.ts, src/lib/queries/topics.ts

---

## [ERR-20260604-002] start_process_npm_windows

**Logged**: 2026-06-04T10:03:00+08:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
`Start-Process -FilePath 'npm'` failed on Windows because the shell shim is not a direct Win32 executable.

### Error
```text
This command cannot be run due to the error: %1 不是有效的 Win32 应用程序。
```

### Context
- Command attempted: start Astro dev server through PowerShell `Start-Process`
- Environment: Windows, PowerShell

### Suggested Fix
Use `npm.cmd` with `Start-Process` on Windows when launching npm scripts in the background.

### Metadata
- Reproducible: yes
- Related Files: package.json

---

## [ERR-20260604-003] browser_wait_networkidle

**Logged**: 2026-06-04T10:04:00+08:00
**Priority**: low
**Status**: pending
**Area**: tests

### Summary
The in-app browser Playwright runtime rejected `waitForLoadState({ state: "networkidle" })`.

### Error
```text
playwright_wait_for_load_state does not support networkidle
```

### Context
- Browser validation of local Astro app
- Method attempted through in-app browser Playwright API

### Suggested Fix
Use `load` or `domcontentloaded` in this runtime unless `networkidle` support is confirmed.

### Metadata
- Reproducible: unknown
- Related Files: none

---

## [ERR-20260604-004] astro_build_exit_assertion

**Logged**: 2026-06-04T10:06:00+08:00
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
`npm run build` completed Astro generation but exited with a Windows/libuv assertion failure.

### Error
```text
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76
```

### Context
- Astro build printed `Complete!` and generated 24 pages before the assertion.
- A dev server was running in parallel for browser validation.

### Suggested Fix
Rerun build after checking running Node/Astro processes; if reproducible, isolate whether it is caused by concurrent dev server/watch processes or the Node runtime.

### Metadata
- Reproducible: unknown
- Related Files: package.json

---

## [ERR-20260604-005] powershell_pid_variable

**Logged**: 2026-06-04T10:10:00+08:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
Using `$pid` as a loop variable in PowerShell conflicts with the built-in read-only `$PID` variable because variables are case-insensitive.

### Error
```text
Cannot overwrite variable PID because it is read-only or constant.
```

### Context
- Attempted to stop a known set of local dev server process IDs.
- Environment: PowerShell on Windows.

### Suggested Fix
Use a different loop variable name such as `$processId`.

### Metadata
- Reproducible: yes
- Related Files: none

---
