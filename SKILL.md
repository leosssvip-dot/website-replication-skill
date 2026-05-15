---
name: website-replication-skill
version: 0.1.0
description: Audit a reference website or web app and produce a differentiated parity plan covering UI, interactions, API contracts, data model, and architecture. Use when benchmarking a competitor, replicating a legacy or partner site, matching product capabilities, reproducing workflow behavior with original branding, or auditing missing UI/function/API details.
---

# Website Replication

> **Required tooling**: at least one browser automation MCP (Chrome MCP / Playwright MCP / Claude Preview). Without it, the skill degrades to static HTML fetch and every interaction is forced to `inferred`; coverage drops to 0% by definition. See *Tooling* for the full list and *Troubleshooting* for the no-browser fallback.
>
> **Agent harness**: this skill is markdown + JS + YAML; any agent harness that can load markdown skills and call file + browser tools can run it. Claude Code and OpenAI Codex are the tested harnesses; other harnesses work by symlinking or copying the directory into their skill location.
>
> 中文导读：[SKILL.zh.md](SKILL.zh.md)（人类阅读用镜像；agent 仍加载本英文版）

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
- Audit output lives in the **consumer project** (wherever the skill is invoked), not in the skill repo. Add the following block to that project's `.gitignore` so the snapshot cache survives across machines while high-risk evidence stays local:

  ```gitignore
  # Audit output written by website-replication-skill.
  # Tracks PNG screenshots and MANIFEST.md (the cross-audit snapshot index);
  # ignores DOM dumps, network traces, reports, and other high-risk types.
  # IMPORTANT: review every PNG for visible PII (usernames, emails, customer
  # content, internal IDs) BEFORE committing.
  # To lock the directory down entirely, replace this whole block with: audit/
  audit/**/*.html
  audit/**/*.htm
  audit/**/*.har
  audit/**/*.har.gz
  audit/**/*.json
  audit/**/*.txt
  audit/**/*.log
  audit/**/*.csv
  audit/**/network/
  audit/**/dom/
  audit/**/reports/
  ```

  If the consumer project is public, or you cannot guarantee PNG redaction, prefer the conservative `audit/` line instead.

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
- Default evidence directory and **cross-audit screenshot reuse**: root at `./audit/<site-slug>/` (honor a user-provided path if given). Layout:

  ```
  audit/<site-slug>/
  ├── MANIFEST.md                # central index, one row per unique URL × viewport × auth
  ├── snapshots/<YYYY-MM-DD>/    # screenshots + DOM dumps captured that day
  ├── network/<YYYY-MM-DD>/      # network traces (time-sensitive — always fresh, never reused)
  └── reports/<YYYY-MM-DD>.md    # the audit deliverable
  ```

  `MANIFEST.md` is the single source of truth for "have I captured this before?". Format:

  ```markdown
  | URL | Viewport | Auth | Last Captured | Snapshot | DOM | Notes |
  | --- | --- | --- | --- | --- | --- | --- |
  | https://example.com/dashboard | desktop-1440 | free | 2026-05-15 | snapshots/2026-05-15/dashboard.png | snapshots/2026-05-15/dashboard.html | post-redesign |
  ```

  **Reuse rule (time-based, 30-day window)**: if a manifest entry exists and `Last Captured` is within 30 days, reuse the stored snapshot and DOM, and tag the evidence row `observed (cached from <date>)`. Otherwise capture fresh and append / update the manifest. Force-fresh capture when the user explicitly asks or the cached snapshot is visibly stale against the live page. Network traces are never reused — auth class, rate-limit headers, and A/B bucketing are all time-sensitive.

## Workflow

1. **Define scope and evidence**
   - List every competitor page, route, tab, mode, drawer, modal, and post-submit state in scope.
   - **Read `audit/<site-slug>/MANIFEST.md` first** (format: [references/manifest-template.md](references/manifest-template.md)). For each in-scope URL × viewport × auth-state, look up the row. Cache hit (entry exists, `Last Captured` within the cache window — default 30 days, see *Configuration*) → reuse the stored snapshot + DOM, tag the evidence row `observed (cached from <date>)`, do not re-capture. Cache miss or stale → capture fresh and append / update the manifest row. Create `MANIFEST.md` with the template header if it does not exist yet.
   - Capture desktop and mobile screenshots only for URLs that missed the cache. Prefer full-page screenshots plus focused component screenshots.
   - Save redacted evidence: DOM text, control inventories (buttons / inputs / links), network calls, console errors, screenshots. Network traces are always fresh — never reused, never read from old dates.
   - If the page is dynamic, inspect after interaction, not just the initial render.
   - Track each claim as `observed`, `documented`, `inferred`, `blocked`, or `not applicable`. Cached evidence stays `observed` — the 30-day window is the reliability budget.

2. **Extract UI system**
   - Document layout, grid, shell / navigation, density, spacing, radius, borders, colors, typography, media treatment, shadows, motion.
   - Build a component inventory: navigation, cards, tabs, segmented controls, inputs, uploads, chips, toolbars, modals, drawers, result/list items, history panels, gating UI.
   - Produce HTML/CSS examples *using the target brand's own tokens and copy*, demonstrating only the structural pattern (e.g. flex layout with left icon + label). Do not paste competitor class names, exact spacing values, or copy.
   - Keep UI differentiation intentional: preserve interaction logic and field structure while changing branding, copy, imagery, and visual rhythm.

3. **Enumerate and probe interactions**
   - **Enumerate first, click second.** Run [references/dom-enumeration.js](references/dom-enumeration.js) via the browser-MCP eval call (or paste into DevTools console). Save the markdown output to `audit/<site-slug>/snapshots/<date>/<page-slug>-inventory.md`, following [references/inventory-template.md](references/inventory-template.md). The script handles selector priority, shadow-DOM piercing, and `cursor:pointer` detection — do not re-invent the enumeration logic.
   - Walk the inventory by ID. For each row fill in `Probed` (`✓` / `✗`), `Result` (action + outcome + network call observed + `observed`/`inferred`/`blocked` tag), and `Notes`. Do not skip an ID without writing a reason in `Result`.
   - Treat icon-only and visually-decorative-looking controls as functional until proven otherwise. Save / clear / copy / expand / randomize / regenerate / share / more — probe each individually.
   - For each interaction also record: validation, disabled state, loading state, optimistic update, error, success output, post-submit action, auth / permission redirect, paywall / quota behavior, and mobile sticky behavior.
   - If the page is dynamic, re-run the enumeration script after each major state change (mode switch, modal open, post-submit). Append the new rows below the existing ones with a `<!-- After <state change> -->` divider.

4. **Probe hidden states**

   Run each pass once per primary page; mark `not applicable` for any that genuinely don't apply. Skipping this step is the #1 source of parity gaps.

   - **Hover / focus**: tab through every focusable element and hover every interactive element; capture revealed tooltips, popovers, secondary actions, helper text.
   - **Keyboard shortcuts**: at minimum try `?` (help overlay), `/` (search focus), `ctrl/cmd+k` (command palette), `esc` (modal / drawer close), `enter` (submit), arrow keys (list nav), `tab` order and traps, undo / redo.
   - **Right-click / long-press**: try the primary content area, list items, and any rich-content surface for custom context menus.
   - **Drag / drop / reorder**: try repositioning list items, files, cards; record the reorder API and any cross-container moves.
   - **Scroll-triggered**: scroll to bottom (infinite scroll, lazy load, sticky CTA, "back to top"); scroll within nested containers; mobile bottom-bar appearance.
   - **Input edge cases**: empty submit · max length · paste of formatted content · paste of disallowed chars · IME composition · disabled-state attempts.
   - **Network states**: throttle to slow 3G and capture skeletons / spinners; toggle offline and capture error UX; force a 5xx (DevTools "Network → Block" + replay) and capture recovery affordance.
   - **URL / history**: deep-link directly into a state · back / forward across modes · refresh mid-flow · open in new tab from a list item.
   - **Multi-window / cross-tab**: where state is shared (carts, drafts, notifications), open a second tab and probe sync direction.

5. **Audit API and backend capability**
   - Capture observed network calls with method, route pattern, headers / auth class, redacted payload shape, response shape, status code, error class.
   - Read official / API / integration docs when available. Separate `observed`, `documented`, and `inferred` claims.
   - Map competitor UI fields to target backend fields. Preserve existing target API contracts unless the user asks to redesign them.
   - Identify missing endpoints, third-party integrations, auth / permissions, file upload / storage, background jobs, async completion (polling / webhook), billing / quota, rate limits, and persistence / history.
   - Never delete product features because an API or integration is missing. Mark the gap, search docs when allowed, and propose the backend / API preparation needed.

6. **Model data and architecture**
   - Draft core entities suited to the competitor's domain. Adjust to product type: SaaS, e-commerce, content, collaboration, AI tool, marketplace, internal tool, etc.
   - Output ER and status-machine diagrams when data or async tasks matter.
   - Recommend architecture only after API and data needs are known: frontend framework, server / API layer, queue, database, object storage, cache, auth, billing, third-party integrations, observability.

7. **Reflect and verify coverage** *(mandatory before step 8)*
   - Compute coverage: `enumerated N · probed M · coverage M/N (X%)`. If under 90% without a `blocked` reason, return to step 3 and probe the gap before proceeding.
   - Ask explicitly: *"Given this product category, what are the three things I am most likely to have missed?"* Write the three candidates down — common blind spots: post-success states, error recovery paths, settings / preferences, history / undo, sharing / export, mobile-only affordances, paid-tier hints visible to free users — then probe each and record the result.
   - Re-check the inventory against the rendered DOM after the final state. Any new elements added by interactions (modal contents, drawer contents, expanded panels) must be enumerated and probed.
   - Record results in the deliverable's *Interaction Coverage* section. Only after this round may you proceed to step 8.

8. **Plan implementation**
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
- Hover-only reveals, keyboard shortcuts (`?` / `/` / `ctrl+k`), right-click menus, drag-and-drop reorder — invisible without the step-4 hidden-states pass.
- Network failure UX, offline state, slow-network skeletons — invisible until DevTools is throttled.
- URL / history behavior: deep-link, refresh mid-flow, back / forward across modes — invisible without navigating.

## Configuration

Defaults are tuned for the common case. The user may override any in their request; read overrides before step 1 and state the final values in the report.

| Knob | Default | When to override |
| --- | --- | --- |
| Cache window | 30 days | Drop to 7 days for fast-moving SPAs / weekly-deployed products; raise to 90 days for stable enterprise tools. `--fresh` disables reuse for this run. |
| Coverage threshold | 90% | Raise to 100% for high-stakes audits. Lower below 90% only when un-probed elements have `blocked` reasons listed in the gap list. |
| Evidence directory | `./audit/<site-slug>/` | Honor any user-provided path. |
| Differentiation direction | (must be specified or assumed) | `workflow parity with original style` / `same features with target design system` / `research only`. |
| Viewport set | `desktop-1440`, `mobile-iphone14` | Add `tablet-ipad`, larger desktop, or specific device profiles when the product targets them. |
| Reflection round size | 3 candidates | Raise to 5+ for unfamiliar product categories. |

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| No browser MCP available — only static fetch works | Skill cannot observe interactions | Continue, but mark every interaction `inferred`, set Coverage = 0% with reason "no browser automation", and warn the user the result is research-only. |
| `dom-enumeration.js` returns < 5 elements on a non-trivial page | SPA renders into shadow DOM or iframes; selectors miss them | The script pierces open shadow roots; cross-origin iframes are inaccessible by design. For same-origin iframes, re-run inside each frame's context. Closed shadow roots are unreachable — mark `inferred`. |
| Cache hit but the live page visibly differs from the stored screenshot | Site was redesigned within the cache window | Force fresh for this row; update `Last Captured` and add MANIFEST note "redesigned since <previous date>". |
| Network panel shows no requests for an obviously remote action | Call uses WebSocket, Server-Sent Events, or `navigator.sendBeacon` | Switch DevTools to "All" not "Fetch/XHR"; capture WS frames; tag as `observed (via WS)` or `observed (via beacon)`. |
| Authenticated state required but credentials unavailable | Paid / SSO / private surface | Mark `blocked` in the parity matrix; do not bypass auth. Use public docs to fill `documented` rows. |
| `MANIFEST.md` missing on first run | Expected — no prior audit | Create with the header from [references/manifest-template.md](references/manifest-template.md); append rows as you capture. |
| Coverage below 90% with no `blocked` reason | Step 3 was skipped or rushed | Return to step 3 against the unfilled IDs; do not submit the deliverable yet. |
| Reflection round (step 7) produces no concrete misses | Agent saturated on existing report content | Use [references/parity-checklist.md](references/parity-checklist.md) "Hidden States And Coverage" — pick the first three items still unticked. |
| Screenshots tracked into git accidentally show PII | Reviewer skipped the redaction pass | Untrack with `git rm --cached <path>`, sanitize, re-commit. See *Evidence Safety*. Long-term: switch the consumer project's `.gitignore` block to the single `audit/` line. |

## Output

Pick by depth:

- **Quick audit** (≤ 1h, single page or single workflow): use [quick-audit-template.md](references/quick-audit-template.md).
- **Implementation-ready audit**: use [output-template.md](references/output-template.md).
- **Coverage self-check** during Workflow steps 3–7: load [parity-checklist.md](references/parity-checklist.md).

Every deliverable, regardless of depth, must include:

- Evidence summary with screenshot paths and source URLs.
- Interactive inventory (`evidence/interactive-inventory.md`) with stable IDs.
- Interaction coverage block: `enumerated N · probed M · coverage M/N (X%)` plus hidden-state pass status and reflection-round results.
- UI / component inventory.
- Interaction behavior matrix.
- API / backend mapping table (or `no backend work in scope` if research-only).
- Prioritized gap list separating "can implement now" vs "needs API / integration / data preparation".
- Verification checklist.
