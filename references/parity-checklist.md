# Competitor Parity Checklist

## When To Load

Load this checklist during Workflow steps 3–8 of SKILL.md as a *coverage self-check* — not as a sequential to-do. Read once you have at least one round of screenshots, a page region model, a generated interactive inventory, and a draft interaction matrix; use it to spot what you missed before writing the final deliverable.

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

## Page Region Relationships

- Every major area has a semantic `Z*` region ID, not just a visual label.
- Each region has a product purpose: collect input, configure options, preview output, show results, restore history, gate access, navigate, summarize, edit, checkout, etc.
- Input/control regions list owned state and emitted events.
- Output/result regions list consumed state and update triggers.
- Shared state is modeled separately when it affects multiple regions: auth, credits, selected item, current job, workspace, filters, cart, permissions.
- The primary workflow has a region dependency chain, e.g. `Z1 input -> submit payload -> API/job -> Z2 result`.
- Reverse relationships are captured where present: edit result, restore history, regenerate, select item, apply filter.
- Responsive behavior preserves or intentionally changes region responsibilities.
- Unknown relationships are marked `inferred` or `blocked`, not omitted.

## Hidden States And Coverage

- Hover-only reveals: tooltips, popovers, secondary actions, helper text.
- Focus and tab order: traps, skip links, visible focus rings, logical sequence.
- Keyboard shortcuts: `?` help · `/` search · `ctrl/cmd+k` palette · `esc` close · `enter` submit · arrow keys · undo / redo.
- Right-click / long-press context menus on content area and list items.
- Drag / drop / reorder, including cross-container moves.
- Scroll-triggered: infinite scroll, lazy load, sticky elements, back-to-top, nested scroll containers.
- Input edge cases: empty submit, max length, paste formatted, paste disallowed chars, IME composition, disabled-state attempts.
- Network states: slow 3G skeletons, offline, 5xx, timeout — including recovery affordances.
- URL / history: deep link, refresh mid-flow, back / forward across modes, new-tab on list item.
- Multi-window / cross-tab sync where state is shared (carts, drafts, notifications).
- Coverage report present: `enumerated N · probed M · coverage M/N (X%)`; gaps under 90% justified.
- Reflection round: three "most likely missed" candidates probed and reported.

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

## PRD Handoff

- PRD exists for implementation-ready work.
- Each `Z*` region has a requirement contract.
- Each cross-region dependency has a stable contract ID.
- Region contracts include visible conditions, owned state, consumed state, emitted events, updates, and empty/loading/error/success states.
- API and data contracts reference the relevant region or contract ID.
- Acceptance criteria are testable and not just descriptive.
- Blocked work is separated from ready implementation work.

## Verification

- Unit / component tests for every new control behavior.
- Payload contract tests for every submitted field.
- Region relationship tests for primary cross-region contracts.
- API route tests for validation, auth, and failure paths.
- Browser screenshots for desktop and mobile.
- DOM checks: no overflow, expected controls visible, forbidden copied tokens / assets absent.
- Evidence redaction re-check before delivering the report.
- Build / typecheck / lint.
- Manual or automated test for the original missed behavior that prompted the audit.
