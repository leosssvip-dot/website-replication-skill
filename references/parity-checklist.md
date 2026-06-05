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
- Page layout, columns, sticky areas, scroll containers, and region relationships.
- Responsive breakpoints: when sidebars collapse, when secondary panels stack, whether primary and secondary work areas preserve intended proportions, and whether any panel stacks earlier than the reference.
- Scroll ownership: full page vs internal list scroll, bounded panels, pagination footers, sticky CTA rails, fixed global players, sidebar bottom rails, and whether these areas overlap.
- List loading model: pagination, infinite scroll, scroll-to-load, explicit load-more button, automatic fill, terminal state, and reset after search / filter / sort / container changes.
- Underfilled list state: whether the first batch fills the scroll container; if not, how the reference still exposes or triggers loading more items.
- Typography scale, font families, weights, letter spacing.
- Color roles: background, panel, border, muted text, accent, success, warning, error.
- Spacing rhythm, component density, radius, shadow, separators.
- Buttons: primary, secondary, icon-only, disabled, loading.
- Inputs: textarea, select, radio, segmented control, slider, upload, search, chips.
- Cards / list items: example cards, result cards, history cards, gating cards.
- List item information architecture: artwork / thumbnail, play affordance, title, edit affordance, prompt / description, duration, status, tags, row actions, more menu, active / selected / disabled states.
- Motion: hover, focus, tab switch, modal / drawer, skeleton / loading.
- Responsive behavior: wrapping, sticky CTA, bottom nav, overflow, tap targets.

## Interaction Behavior

- Mode / tab switching and preserved-vs-discarded state between modes.
- Helper actions: randomize, examples, suggestions, chips, builder panels, inline tools.
- Text tools: clear, save, restore, copy, expand / fullscreen, insert, counters.
- Control intent ledger complete for primary, secondary, icon-only, picker, saved-item, and result-routing controls.
- Picker / selector controls: logged-out gate, logged-in open behavior, option list, current selected label, select / create / clear behavior where present, close behavior, refresh persistence, and downstream submit / move effect.
- Saved content controls: save, restore / use saved, delete / clear saved, and persistence scope are observed separately rather than inferred from icon shape.
- Upload / source tools: local upload, library source, drag / drop, remove, preview.
- Advanced settings: defaults, collapsed state, validation, reset.
- Submission: disabled criteria, auth redirect, quota / paywall gate, loading / progress, cancellation.
- Async tasks: pending polling, webhook completion, retry, timeout, failed state.
- Results / post-submit: preview, variants, download, save, edit / extend, share, metadata, history.
- State-dependent region replacement: examples / inspiration / empty states vs generated-content lists, task queues, folders, history, or result workspaces.
- Pending vs completed row parity: same row proportions and layout unless the reference clearly changes them; pending rows should not feel like a separate product.
- Menus and submenus: ellipsis / kebab actions, remix / edit action menus, download submenus, move-to pickers, filter menus, sort menus, outside-click dismissal, disabled actions, destructive actions.
- Destination controls: view / preview / open / use / share / download actions reach the observed destination class (modal, side panel, drawer, route, file, picker, external target, disabled state, or blocked), not just any destination.
- Popover geometry: parent menu, submenu, row controls, CTA, pagination, and mobile nav remain visible and usable according to the reference collision rules.
- Workspace / folder behavior when applicable: breadcrumb clickability, directory view, create folder / workspace, archive view, item move-to destination picker, current destination disabled, active-folder item counts.
- Shared-state consistency: generator destination / source selection, saved-item picker, workspace or folder view, result row, and history rail agree after selection and after refresh.
- Selection and bulk actions: row checkbox placement, select-all, selected-count menu, bulk move, bulk download, disabled bulk delete, and how selection interacts with filters, pagination, and current workspace / collection.
- Global controls: fixed / sticky player or action rail, previous / next, seek, mute, close, like / dislike, share, and whether the control blocks CTAs, pagination, list rows, or mobile bottom navigation.
- Filters and sorting: actual filter semantics, default filters, active filter summary, reset behavior, sort icon / direction, and empty-result recovery.

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

## Region Layout Constraints

- Placement is captured for every major region: top, bottom, left, right, inline, overlay, drawer, modal, or center.
- Anchor target is identified: viewport, parent container, sibling region, scroll container, or safe area.
- Positioning mode is identified: normal-flow, sticky / fixed / docked, absolute, floating, or overlay.
- Sizing rule is captured: fixed, fill, intrinsic, min-max, aspect-ratio, or content-driven.
- Scroll behavior is captured: scrolls with page, fixed during scroll, sticky within container, or independently scrollable.
- Layering and containment are captured: inline, overlay, z-layer, backdrop, clipped by parent, reserves space, or overlays content.
- Responsive transform is captured: two-column -> stacked, side panel -> bottom sheet, toolbar -> bottom bar, drawer -> full-screen, etc.
- Collision rules are checked: keyboard / safe-area, bottom nav, floating action button, toast, cookie bar, and modal backdrop.

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
- Persistence scope classification: local-only, session-only, account-persistent, workspace / project-persistent, shared / collaborative.
- Persisted interaction state: folders / workspaces / collections, moved item assignments, likes / dislikes, favorites, hidden / archived state, saved filters, search or sort preferences, and history.
- Migration / schema / policy needs for new persistence: tables, enums, ownership, RLS / permission policies, read route, mutation route, rollback path.
- Hydration risk: server-rendered counts, visible labels, selected workspace / folder, filters, timestamps, random IDs, and client-only storage that can change the initial HTML.
- Gaps: missing endpoint, missing third-party docs, UI-only feature, unsafe fake-enabled state.

## Evidence Safety

- Raw evidence excludes cookies, auth headers, session IDs, tokens, one-time URLs, account identifiers, customer data, uploaded contents, and private messages.
- Network evidence uses auth class and redacted shapes instead of full headers or full payloads.
- Paid / auth-only states that cannot be accessed safely are marked `blocked`.
- Implementation recommendations distinguish facts from assumptions and include confidence.

## Architecture And Data

- Entities and relationships.
- Status machines for async jobs.
- Container / collection model for list products: workspace / folder / collection, item membership, item state, feedback, archived / deleted state, pagination, and sort.
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
- Persistence tests for account / workspace state across reload, origin / port change, server restart, or a fresh client where applicable.
- Picker and saved-item tests for open/select/create/clear/close behavior, current label persistence, and selected destination applied to the created / moved item.
- Destination-class tests or browser checks for view / preview / open / use controls.
- List-loading tests or browser checks for underfilled and overflowing states, visible-count label updates, item append, terminal state, and reset after search / filter / sort.
- Hydration tests or SSR/client mismatch checks for visible counts, labels, folders, filters, and local-only state.
- Browser screenshots for desktop and mobile.
- DOM checks: no overflow, expected controls visible, popovers dismiss, CTA / player / pagination do not overlap, bounded panels do not stretch the page, forbidden copied tokens / assets absent.
- Browser automation evidence is scoped by region / role / inventory ID so duplicate visible text or hidden controls cannot create false positives.
- Evidence redaction re-check before delivering the report.
- Build / typecheck / lint.
- Manual or automated test for the original missed behavior that prompted the audit.
