---
name: website-replication-skill
description: Audit a reference website or web app and produce a differentiated parity plan covering UI, interactions, API contracts, data model, and architecture. Use when benchmarking a competitor, replicating a legacy or partner site, matching product capabilities, reproducing workflow behavior with original branding, or auditing missing UI/function/API details.
---

# Website Replication

Audit any reference website — typically a competitor, but the same workflow applies to legacy versions of your own product, partner integrations, or inspiration sources you want to learn behavior from. "Competitor" throughout this document means *the site being audited*, not necessarily a market rival.

## Core Rule

Replicate useful product behavior, not protected expression. Do not copy logos, exact copy, proprietary assets, distinctive page composition, or a page structure so literally that it creates infringement risk. Preserve workflow intent, configuration fields, state handling, and backend capability mapping, while using original branding, copy, imagery, and visual rhythm unless the user explicitly asks for research-only comparison.

## Out Of Scope

- Legal / IP / ToS compliance judgement. Flag risk, do not make a legal call. Recommend the user consult counsel for trademark, patent, or ToS questions.
- Performance benchmarking, SEO ranking, or marketing-channel analysis. Not feature parity. Use a dedicated skill.
- Pure visual inspiration ("their UI feels nicer"). Prefer `ui-style-extractor`, which is lighter weight when only a style guide is needed.
- Authenticated or paid state the user cannot legitimately access. Mark blocked. Do not bypass auth, paywalls, rate limits, robots restrictions, or technical protections.

## Evidence Safety

- Redact secrets and personal data before saving or reporting evidence: cookies, authorization headers, session IDs, tokens, account identifiers, customer data, uploaded file contents, message/prompt contents that may contain private data, and one-time URLs.
- For network traces, record method, route pattern, auth class, redacted payload shape, response shape, status code, and error class. Do not paste raw credential-bearing headers or full private payloads.
- Respect access boundaries. If a state requires paid or authenticated access that is unavailable, mark it as blocked and infer only from visible evidence or official docs.

## Required Inputs

Collect or infer:

- Competitor URL(s) and the target product / page scope.
- Existing codebase path, if rebuilding into a repo.
- Existing API docs, integration docs, schemas, or backend constraints.
- Differentiation preference: "workflow parity with original style", "same features with target design system", or "research only".

If any input is unavailable, proceed with explicit assumptions and mark unknowns. Do not block unless the task requires authenticated data, paid access, or private target-system details that cannot be simulated safely. Without a target repo, integration docs, or API constraints, produce research and a gap plan only; do not claim the result is implementation-ready.

## Tooling

Pick whatever is available; degrade gracefully and re-classify evidence accordingly.

- Browser automation (click, screenshot, DOM dump, network capture): prefer a browser MCP (e.g. Chrome MCP, Playwright MCP, Claude Preview) or a headless runner. Without one, fall back to static fetch + HTML parse and mark every interaction `inferred`.
- Network inspection: DevTools panel via the browser MCP, or `curl -v` for unauthenticated endpoints.
- Mobile: a mobile MCP / device farm for real screenshots; otherwise emulate via DevTools responsive mode and mark device-specific behavior `inferred`.
- Static docs / API references: `WebFetch` or a web-reader MCP.
- Default evidence directory: `./audit/<competitor-slug>/<YYYY-MM-DD>/` with `screenshots/`, `network/`, `dom/`, `report.md`. Honor a user-provided path if given.

## Workflow

1. **Define scope and evidence**
   - List every competitor page, route, tab, mode, drawer, modal, and post-submit state in scope.
   - Capture desktop and mobile screenshots. Prefer full-page screenshots plus focused component screenshots.
   - Save redacted evidence: DOM text, control inventories (buttons / inputs / links), network calls, console errors, screenshots.
   - If the page is dynamic, inspect after interaction, not just the initial render.
   - Track each claim as `observed`, `documented`, `inferred`, `blocked`, or `not applicable`.

2. **Extract UI system**
   - Document layout, grid, shell / navigation, density, spacing, radius, borders, colors, typography, media treatment, shadows, motion.
   - Build a component inventory: navigation, cards, tabs, segmented controls, inputs, uploads, chips, toolbars, modals, drawers, result/list items, history panels, gating UI.
   - Produce HTML/CSS examples *using the target brand's own tokens and copy*, demonstrating only the structural pattern (e.g. flex layout with left icon + label). Do not paste competitor class names, exact spacing values, or copy.
   - Keep UI differentiation intentional: preserve interaction logic and field structure while changing branding, copy, imagery, and visual rhythm.

3. **Probe interactions**
   - Click every visible control: tabs, mode switches, secondary actions (clear, copy, save, expand, randomize, optimize, more), submit / CTA, upload / select flows, advanced toggles, examples, history items, gated states.
   - Record state transitions, validation, disabled states, loading states, optimistic updates, errors, success output, post-submit actions, auth / permission redirects, paywall / quota behavior, and mobile sticky controls.
   - Treat small controls as functional until proven decorative. Missing behavior is a product gap even when the UI looks similar.

4. **Audit API and backend capability**
   - Capture observed network calls with method, route pattern, headers / auth class, redacted payload shape, response shape, status code, error class.
   - Read official / API / integration docs when available. Separate `observed`, `documented`, and `inferred` claims.
   - Map competitor UI fields to target backend fields. Preserve existing target API contracts unless the user asks to redesign them.
   - Identify missing endpoints, third-party integrations, auth / permissions, file upload / storage, background jobs, async completion (polling / webhook), billing / quota, rate limits, and persistence / history.
   - Never delete product features because an API or integration is missing. Mark the gap, search docs when allowed, and propose the backend / API preparation needed.

5. **Model data and architecture**
   - Draft core entities suited to the competitor's domain. Adjust to product type: SaaS, e-commerce, content, collaboration, AI tool, marketplace, internal tool, etc.
   - Output ER and status-machine diagrams when data or async tasks matter.
   - Recommend architecture only after API and data needs are known: frontend framework, server / API layer, queue, database, object storage, cache, auth, billing, third-party integrations, observability.

6. **Plan implementation**
   - Turn the audit into a parity matrix: competitor behavior, target implementation, API mapping, readiness, risk, acceptance criteria.
   - Prioritize by user workflow impact: primary path first, then result / post-action behavior, history, secondary pages, SEO / support pages.
   - Split work into "can implement now" and "needs API / integration / data preparation"; do not present blocked backend work as ready.
   - Verification follows the target repo's existing conventions (CLAUDE.md / test framework). For new interaction behavior, add at least a happy-path test and a payload-contract test before merging.
   - Verify with build / typecheck / lint, screenshots, DOM checks for overflow / responsive behavior, and API contract checks.

## Common Misses To Prevent

- Icon-only buttons with no behavior: clear, save, randomize, expand, copy, download, regenerate, share, more.
- Hidden state changes: selected tabs, mode switches, advanced toggles, uploaded / selected source state, draft / restore state.
- User feedback: character counters, saved / restored notices, disabled reasons, validation text, empty states, loading / progress, error recovery.
- Result / post-action: download, save to library, edit / extend, share, metadata, related items, source attribution.
- Backend mismatch: UI fields not sent, sent fields not documented, fake enabled buttons for unsupported APIs, missing auth / quota / polling / webhooks.
- Mobile details: sticky CTA, bottom nav, no horizontal overflow, toolbars wrapping cleanly, text fitting inside controls, hit-target sizing.

## Output

Pick by depth:

- **Quick audit** (≤ 1h, single page or single workflow): use [quick-audit-template.md](references/quick-audit-template.md).
- **Implementation-ready audit**: use [output-template.md](references/output-template.md).
- **Coverage self-check** during Workflow steps 3–5: load [parity-checklist.md](references/parity-checklist.md).

Every deliverable, regardless of depth, must include:

- Evidence summary with screenshot paths and source URLs.
- UI / component inventory.
- Interaction behavior matrix.
- API / backend mapping table (or `no backend work in scope` if research-only).
- Prioritized gap list separating "can implement now" vs "needs API / integration / data preparation".
- Verification checklist.
