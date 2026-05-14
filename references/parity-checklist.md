# Competitor Parity Checklist

## When To Load

Load this checklist during Workflow steps 3–5 of SKILL.md as a *coverage self-check* — not as a sequential to-do. Read once you have at least one round of screenshots and a draft interaction matrix; use it to spot what you missed before writing the final deliverable.

Skip items that do not apply to the competitor's product category and say so in the report rather than leaving them unmarked.

## Status Tagging

Mark each item: `matched`, `different by design`, `missing`, `blocked`, or `not applicable`.
Mark claim source: `observed`, `documented`, or `inferred`.

## Page And Route Coverage

- Public landing page and primary CTA path.
- Primary app / tool page.
- Every tab, mode, drawer, modal, advanced area, and "more" menu.
- Auth-gated state, logged-out state, trial / free state, paid / quota state.
- Empty, loading, error, success, and completed-result states.
- Desktop, tablet if relevant, and mobile.

## UI System

- Shell / navigation hierarchy and active states.
- Page layout, columns, sticky areas, scroll containers.
- Typography scale, font families, weights, letter spacing.
- Color roles: background, panel, border, muted text, accent, success, warning, error.
- Spacing rhythm, component density, radius, shadow, separators.
- Buttons: primary, secondary, icon-only, disabled, loading.
- Inputs: textarea, select, radio, segmented control, slider, upload, search, chips.
- Cards / list items: example cards, result cards, history cards, gating cards.
- Motion: hover, focus, tab switch, modal / drawer, skeleton / loading.
- Responsive behavior: wrapping, sticky CTA, bottom nav, overflow, tap targets.

## Interaction Behavior

- Mode / tab switching and preserved-vs-discarded state between modes.
- Helper actions: randomize, examples, suggestions, chips, builder panels, inline tools.
- Text tools: clear, save, restore, copy, expand / fullscreen, insert, counters.
- Upload / source tools: local upload, library source, drag / drop, remove, preview.
- Advanced settings: defaults, collapsed state, validation, reset.
- Submission: disabled criteria, auth redirect, quota / paywall gate, loading / progress, cancellation.
- Async tasks: pending polling, webhook completion, retry, timeout, failed state.
- Results / post-submit: preview, variants, download, save, edit / extend, share, metadata, history.

## API And Backend

- Observed network calls: method, route pattern, redacted payload shape, response shape, status code, errors.
- Documented API: endpoints, params, required / optional fields, enum values, callbacks.
- Target mapping: UI field → local payload → external payload → stored field.
- Auth / session requirements and permission checks.
- Quota / billing / rate limit / concurrency limit.
- File storage: upload, presign, validation, retention, download authorization.
- Async / job lifecycle: created, pending, processing, completed, failed, cancelled.
- Webhooks and polling reconciliation.
- Data persistence and history retrieval.
- Gaps: missing endpoint, missing third-party docs, UI-only feature, unsafe fake-enabled state.

## Evidence Safety

- Raw evidence excludes cookies, auth headers, session IDs, tokens, one-time URLs, account identifiers, customer data, uploaded contents, and private messages.
- Network evidence uses auth class and redacted shapes instead of full headers or full payloads.
- Paid / auth-only states that cannot be accessed safely are marked `blocked`.
- Implementation recommendations distinguish facts from assumptions and include confidence.

## Architecture And Data

- Entities and relationships.
- Status machines for async jobs.
- Caching boundaries and invalidation.
- Background workers / serverless jobs.
- Object-storage layout.
- Observability: logs, metrics, external-call payload capture without secrets.
- Security: secret handling, customer data, ownership checks, abuse controls.

## Verification

- Unit / component tests for every new control behavior.
- Payload contract tests for every submitted field.
- API route tests for validation, auth, and failure paths.
- Browser screenshots for desktop and mobile.
- DOM checks: no overflow, expected controls visible, forbidden copied tokens / assets absent.
- Evidence redaction re-check before delivering the report.
- Build / typecheck / lint.
- Manual or automated test for the original missed behavior that prompted the audit.
