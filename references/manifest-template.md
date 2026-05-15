# MANIFEST.md template

Lives at `audit/<site-slug>/MANIFEST.md`. One row per unique `URL × Viewport × Auth`. Update whenever a new snapshot is captured or an existing one is reused under the cache window.

| URL | Viewport | Auth | Last Captured | Snapshot | DOM | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| https://example.com/dashboard | desktop-1440 | free | 2026-05-15 | snapshots/2026-05-15/dashboard.png | snapshots/2026-05-15/dashboard.html | post-redesign |
| https://example.com/dashboard | mobile-iphone14 | free | 2026-05-15 | snapshots/2026-05-15/dashboard-mobile.png | snapshots/2026-05-15/dashboard-mobile.html | |
| https://example.com/settings | desktop-1440 | paid | 2026-05-15 |  |  | blocked: free tier only |

## Field conventions

- **URL** — full URL with query string when meaningful. Strip session-bound query params (`?utm_*`, `?session=...`, one-time tokens).
- **Viewport** — `desktop-<width>` or `mobile-<device>` (e.g. `desktop-1440`, `mobile-iphone14`, `tablet-ipad`). Match what the browser-MCP reports.
- **Auth** — `anonymous` / `free` / `paid` / `admin` / `sso`. Match the auth class used in network evidence.
- **Last Captured** — ISO date `YYYY-MM-DD`. Empty for `blocked` rows.
- **Snapshot / DOM** — paths relative to `audit/<site-slug>/`. DOM dump is optional but strongly recommended. Empty for `blocked`.
- **Notes** — free text: page version, "redesigned since <date>", "blocked: paid", "captured behind SSO", "iframe content excluded", etc.

## Lookup protocol (mandatory, Workflow step 1)

Before capturing any `URL × Viewport × Auth` combination:

1. Read this file. If a matching row exists and `Last Captured` is within the cache window (default 30 days; see SKILL.md *Configuration*), **reuse** the stored snapshot and DOM. Tag the report's evidence row `observed (cached from <Last Captured>)`.
2. Otherwise capture fresh. Append a new row, or update `Last Captured` / `Snapshot` / `DOM` on the existing row.
3. Never reuse network traces — those live in `network/<date>/` and are always fresh.

## When to invalidate a row manually

- The user requests `--fresh` for this audit.
- A pre-capture glance shows the live page has visibly changed since the cached screenshot (layout, copy, controls).
- The audit targets an interaction state different from what the cached static shot captured.

Force-fresh by deleting the row's `Last Captured` / `Snapshot` / `DOM` cells (or the whole row) and re-capturing.
