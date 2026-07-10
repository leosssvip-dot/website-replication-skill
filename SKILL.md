---
name: website-replication-skill
description: Use when benchmarking a competitor, replicating a legacy or partner website, matching product capabilities, reproducing workflow behavior with original branding, or auditing missing UI, interaction, API, data, state, and architecture requirements.
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

## Safety Boundary

Classify each interaction before probing it:

- **Read-only observation**: navigate, open, inspect, dismiss, focus, or view a non-mutating state. Probe normally.
- **Reversible test mutation**: change user-owned test data only when the original state is recorded and rollback can be verified immediately.
- **Consequential actions**: sending/publishing/inviting, deleting, purchasing/upgrading, changing permissions/billing, exporting private data, or triggering external side effects. Open and inspect the pre-commit UI, then stop before the committing action unless the user explicitly names the action and target, confirms the consequence, and provides a safe test environment.

Never treat a deadline, a generic "click everything" request, or data that merely looks disposable as authorization for a consequential action. Never mutate production/customer data to improve coverage. Mark the unexecuted final outcome `blocked: consequential action not authorized`; the safely observed pre-commit UI remains `observed`.

Re-enumerate every confirmation surface. The final committing control gets its own inventory row with `Probed = ✗` and `Result = blocked: consequential action not authorized`; never count it as probed merely because its surrounding confirmation UI was inspected.

Never copy a browser profile. Never ask for or accept passwords, cookies, authorization headers, tokens, session exports, or one-time/magic links. The user authenticates inside a browser they control; the agent only observes the resulting session.

## Fidelity Is Behavior-First And Two-Directional

A thorough audit document is not parity. The four rules below are post-mortem lessons — each is a real miss the human had to catch after a "complete" audit shipped. They override the temptation to call a feature done because it looks done.

- **You cannot replicate what you did not observe — never guess an interactive feature.** Static fetch, public/landing/marketing pages, and first-render DOM cannot reveal post-login, client-side, interactive behavior: what a *Share* / *Favorite* / *More* / *Download* control actually DOES, the dialog it opens, the cascade it expands, the link it produces. `WebFetch` and HTML snapshots see *none* of this. To replicate any interactive or auth-gated feature you MUST drive the **logged-in** product and trigger the feature itself, capturing the real dialog / flow / result. If you cannot reach that state, **pause and ask the user to authenticate inside a browser they control** (see *Reaching Logged-In State*) before settling for `blocked`; never replicate from a guess — a plausible guess ("Share copies a link") is the most expensive miss because it looks finished and ships unreviewed.
- **Capture full content and full depth — a representative sample is a content gap.** A multi-level category → sub-category cascade with dozens of entries is *not* replicated by a handful of top-level items. Expand every menu / cascade / list to its deepest level and record EVERY item at EVERY level. Shipping a token sample as the real thing reads as "done."
- **Reverse-audit your replica against the source — fidelity runs both ways.** The audit covers the *source*; it never catches what your *build* got wrong. Two failure directions, both real:
  - **Under-build (dead stub):** a control that looks replicated — a tab, a kebab item, a toggle, a secondary panel — but has no wiring and no backend. Ship it functioning *exactly* like the source, or omit it. Never ship a shell that merely looks real.
  - **Over-build (phantom feature):** a control or whole feature the source does NOT have, added speculatively. Replicate what exists; add nothing the source lacks. Flag extras and remove them.
- **A replicated front-end trigger is not done until its data and backend dependency are.** A detail / preview action needs its underlying data actually fetched and stored; a gated action (license, upgrade, export, paid download) needs its entitlement / subscription / quota check; a share action needs the public surface the link points to. A trigger wired to absent data (greyed out, empty, or a dead / raw link) is a miss. Trace each feature's data + backend dependency and verify it works with real data across states — not just that the button renders.

## Reaching Logged-In State — User-Controlled Authentication

When an in-scope state requires authentication, ask the user to sign in inside a browser they control. This is normal access, not auth bypass. Mark `blocked` only when they decline, cannot reach it, or lack the paid/private tier.

1. **Batch the ask.** Before pausing, list every logged-in state / flow you need (share dialog, favorites, gated download, post-submit result, …) so a single login covers them all — do not pause once per feature.
2. **Pause and hand off.** Ask the user to sign in inside the existing browser connection or a fresh dedicated browser profile, then confirm when it is ready. Never handle credential/session material.
3. **Resume and capture.** Drive the logged-in session, trigger each feature, classify the evidence `observed`. Redact session artifacts (cookies, tokens, account IDs) per *Evidence Safety*.
4. **Fallback.** If the user cannot or will not hand off access, mark those states `blocked`, fill what you can from public docs (`documented`), and flag the parity risk explicitly — do not guess the hidden behavior.

Safe handoff order:

1. Control the user's already signed-in browser through an approved browser connector when available.
2. Otherwise open a fresh dedicated profile/context and let the user type credentials directly into it.
3. If automation cannot reach it, use user-drives/agent-observes with screenshots or screen sharing.
4. If none is possible, mark the state `blocked`; do not copy a default profile or transfer session material as a shortcut.

## Out Of Scope

- Legal / IP / ToS compliance judgement. Flag risk, do not make a legal call. Recommend the user consult counsel for trademark, patent, or ToS questions.
- Performance benchmarking, SEO ranking, or marketing-channel analysis. Not feature parity. Use a dedicated skill.
- Pure visual inspiration ("their UI feels nicer"). This skill assumes you want behavior + structure parity, not just a style guide; reach for a lighter style-extraction tool instead.
- Authenticated or paid state the user cannot legitimately access. Mark blocked. Do not bypass auth, paywalls, rate limits, robots restrictions, or technical protections.

## Evidence Safety

- Redact secrets and personal data before saving or reporting evidence: cookies, authorization headers, session IDs, tokens, account identifiers, customer data, uploaded file contents, message/prompt contents that may contain private data, and one-time URLs.
- For network traces, record method, route pattern, auth class, redacted payload shape, response shape, status code, and error class. Do not paste raw credential-bearing headers or full private payloads.
- Respect access boundaries. If a state requires paid or authenticated access that is unavailable, mark it as blocked and infer only from visible evidence or official docs.
- Audit output lives in the **consumer project** (wherever the skill is invoked), not in the skill repo. Default to a fail-closed ignore rule:

  ```gitignore
  # Raw audit evidence can contain private UI, identifiers, URLs, and traces.
  audit/
  ```

  Resolve the raw-evidence root before capture. If it is inside any Git worktree, `git check-ignore -q -- <raw-root>` must succeed; add the exact custom root to that worktree's ignore file when needed. Outside Git, record that the root is untracked. Never capture to an unverified custom root. Share only a separately reviewed, redacted copy outside the raw root.

- Browser helpers sanitize before emitting: form values and free-form text are omitted by default, URL query/hash data is removed, and every returned evidence payload is capped at 50KB. A cap or truncation marker means scope and rerun; it never means coverage is complete.

## Required Inputs

Collect or infer:

- Competitor URL(s) and the target product / page scope.
- Existing codebase path, if rebuilding into a repo.
- Existing API docs, integration docs, schemas, or backend constraints.
- Differentiation preference: "workflow parity with original style", "same features with target design system", or "research only".
- Desired output depth: quick audit, implementation-ready audit, or PRD handoff.

If any input is unavailable, proceed with explicit assumptions and mark unknowns. Do not block unless the task requires authenticated data, paid access, or private target-system details that cannot be simulated safely. Without a target repo, integration docs, or API constraints, produce research and a gap plan only; do not claim the result is implementation-ready.

## Tooling

Pick whatever is available; degrade gracefully and re-classify evidence accordingly.

- Browser automation (click, screenshot, DOM dump, network capture): prefer a browser MCP or headless runner that can operate a user-controlled session. Without one, fall back to static fetch + HTML parse and mark every interaction `inferred`.
- Network inspection: DevTools panel via the browser MCP, or `curl -v` for unauthenticated endpoints.
- Mobile: a mobile MCP / device farm for real screenshots; otherwise emulate via DevTools responsive mode and mark device-specific behavior `inferred`.
- Static docs / API references: `WebFetch` or a web-reader MCP.
- Default evidence directory and **cross-audit screenshot reuse**: root at `./audit/<site-slug>/`; honor a custom path only after the same fail-closed ignore check. Layout:

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
   - Split the page into named regions early (shell / sidebar, primary work area, secondary panel, bottom action rail or player, global overlays) and note how each region affects the others. Do this even if step 3 will formalize the model later.
   - Capture desktop and mobile screenshots only for URLs that missed the cache. Prefer full-page screenshots plus focused component screenshots.
   - Save redacted evidence: screenshots, control inventories, network shapes, console errors, and a **structural DOM snapshot**. Prefer the browser MCP's accessibility tree. Otherwise run [references/dom-distill.js](references/dom-distill.js), which omits free-form text/form values by default, strips URL query/hash data, and caps output at 50KB. Raw `outerHTML` is file-only and must never be loaded into model context. Network traces are always fresh.
   - If the page is dynamic, inspect after interaction, not just the initial render.
   - For each primary workflow, capture before-submit, in-progress, completed, empty, filtered / selected, and mobile states. Do not assume examples / showcases / empty states remain once real user content exists.
   - For list and workspace-like workflows, capture a content-filled state that exercises the reference loading model. Include both underfilled and overflowing list states when possible; record batch size, visible-count text, trigger gesture, and reset behavior after search, filter, sort, or container changes.
   - Track each claim as `observed`, `documented`, `inferred`, `blocked`, or `not applicable`. Cached evidence stays `observed` — the 30-day window is the reliability budget.
   - Start a Control Intent Ledger using [references/parity-trap-ledger.md](references/parity-trap-ledger.md). Every visible control in scope must later have observed intent, complete outcome, auth / persistence class, region effect, backend mapping, and verification evidence.

2. **Extract UI system**
   - Run [references/design-tokens.js](references/design-tokens.js) via the browser-MCP eval. It histograms `getComputedStyle` across visible elements and outputs a markdown table of top colors, fonts, sizes, radii, shadows, spacings — populate the deliverable's Visual Tokens table from this rather than eyeballing CSS.
   - Document layout, grid, shell / navigation, density, spacing, radius, borders, colors, typography, media treatment, shadows, motion — the script gives the numbers; you write the synthesis. For list-heavy pages, also record the header / controls height budget and how many rows remain visible above any footer or bottom rail.
   - Document layout relationships, not just individual components: column ratios, when panels stack, scroll ownership, sticky / fixed bottom rails, sidebars with independent bottom sections, whether lists are paginated / internally scrolled / page-scrolled, and collision behavior with global controls.
   - Build a component inventory: navigation, cards, tabs, segmented controls, inputs, uploads, chips, toolbars, modals, drawers, result/list items, history panels, gating UI.
   - Produce HTML/CSS examples *using the target brand's own tokens and copy*, demonstrating only the structural pattern (e.g. flex layout with left icon + label). Do not paste competitor class names, exact spacing values, or copy.
   - Keep UI differentiation intentional: preserve interaction logic and field structure while changing branding, copy, imagery, and visual rhythm.

3. **Model page regions and relationships**
   - Before interaction probing, create a Page Region Relationship Model using [references/region-model-template.md](references/region-model-template.md). A region is a semantic responsibility boundary, not just a visual box: generator panel, result panel, history list, editor canvas, checkout summary, settings drawer, preview area, etc.
   - Assign stable `Z*` IDs to every major region. Use screenshot position, DOM landmarks, accessibility tree, inventory IDs, and bounding boxes as evidence.
   - For each region, capture: purpose, owned state, consumed state, emitted events, updated regions, empty/loading/error/success states, responsive behavior, source, and confidence.
   - For each region, capture **Region Layout Constraints**: Placement, Anchor Target, Positioning Mode, sizing rule, scroll behavior, layering / containment, responsive transform, Collision Rules, evidence, source, and confidence. This is where terms like bottom-docked, sticky within container, fixed to viewport, overlay, independently scrollable, safe-area-aware, or keyboard-avoiding belong.
   - For list and workspace-like products, explicitly model list containers, folder / collection navigation, active selection, pagination / internal scroll / infinite scroll / scroll-to-load, filter summaries, visible-count labels, empty underfilled states, and footer alignment as region responsibilities rather than cosmetic details.
   - Model cross-region dependencies explicitly. Example: `Z1 Generator Panel -> submit payload -> Z2 Results Panel -> loading/result/error`; `Z3 History -> restore job -> Z1 form + Z2 result`.
   - Treat shared/gating state as its own dependency when it controls multiple regions: auth, credits, selected item, current job, cart, permissions, workspace, filters.
   - Implementation-ready audits must include a region relationship table and at least one graph or state machine. If relationships are unknown, mark `inferred` or `blocked`; do not omit them.

4. **Enumerate and probe interactions**
   - **Enumerate first, click second.** Eval [references/dom-enumeration.js](references/dom-enumeration.js). Require returned `hookInstalled: true`, retain its `hookName` outside page state, and save `result.output` to `audit/<site-slug>/snapshots/<date>/<page-slug>-inventory.md` using [references/inventory-template.md](references/inventory-template.md). The helper handles selector priority, shadow DOM, and `cursor:pointer` detection.
   - Classify every control under *Safety Boundary* before triggering it. Opening a confirmation UI is observation; committing a consequential action is a separate authorization boundary. Do not trade safety for coverage.
   - Walk the inventory by ID. First map each row to a `Z*` region. Then fill in `Probed` (`✓` clicked / `o` observed-by-URL-or-attribute / `✗` skipped), `Result` (action + outcome + network call observed + `observed` / `inferred` / `blocked` tag), and `Notes`. Do not skip an ID without writing a reason in `Result`.
   - Update the Control Intent Ledger for every primary, secondary, and icon-only control. Record its trigger, destination class, current-state label, create/select/clear/restore behavior, persistence, downstream effect, and evidence.
   - **For each non-trivial state change** (modal open, drawer expand, mode switch, post-submit), run [references/dom-distill.js](references/dom-distill.js) before and after, then diff with [references/state-diff.js](references/state-diff.js): `node references/state-diff.js before.md after.md`. For text-only transitions, require `hookInstalled: true`, read the returned `hookName`, and call `window[hookName]({ rootSelector: '#status', includeText: true })` only on a known-public region; otherwise use screenshot/accessibility evidence.
   - Probe every menu depth, picker contract, popover dismissal/collision rule, icon-only control, global control, row control, selection/bulk action, and list-loading state described in [references/parity-trap-ledger.md](references/parity-trap-ledger.md). Record disabled, loading, validation, error, success, auth/quota, mobile, and persistence states; keep any unverified outcome in the gap list.
   - If the page is dynamic, use the externally retained `hookName` to call `window[hookName]({ startIndex: <next unused numeric ID> })` after each major state change. Append each returned `result.output` as the **complete state-specific table** below a divider. Repeated controls get new IDs; never trust a page-rewritten hook name or manually drop rows.

5. **Probe hidden states**

   Run each pass once per primary page; mark `not applicable` for any that genuinely don't apply. Skipping this step is the #1 source of parity gaps.

   - **Hover / focus**: tab through every focusable element and hover every interactive element; capture revealed tooltips, popovers, secondary actions, helper text.
   - **Keyboard shortcuts**: at minimum try `?` (help overlay), `/` (search focus), `ctrl/cmd+k` (command palette), `esc` (modal / drawer close), `enter` (submit), arrow keys (list nav), `tab` order and traps, undo / redo.
   - **Right-click / long-press**: try the primary content area, list items, and any rich-content surface for custom context menus.
   - **Drag / drop / reorder**: try repositioning list items, files, cards; record the reorder API and any cross-container moves.
   - **Scroll-triggered**: scroll to bottom (infinite scroll, lazy load, sticky CTA, "back to top"); scroll within nested containers; probe underfilled and overflowing list states; mobile bottom-bar appearance.
   - **Input edge cases**: empty submit · max length · paste of formatted content · paste of disallowed chars · IME composition · disabled-state attempts.
   - **Network states**: throttle to slow 3G and capture skeletons/spinners; toggle offline and capture error UX. Simulate 5xx only with local interception or a documented test fixture. Never replay a mutation or inject failures against a live production service.
   - **URL / history**: deep-link directly into a state · back / forward across modes · refresh mid-flow · open in new tab from a list item.
   - **Multi-window / cross-tab**: where state is shared (carts, drafts, notifications), open a second tab and probe sync direction.

6. **Audit API and backend capability**
   - Capture observed network calls with method, route pattern, headers / auth class, redacted payload shape, response shape, status code, error class.
   - Run [references/network-cluster.js](references/network-cluster.js) over the captured request list: `node references/network-cluster.js requests.txt`. It clusters by `host + path-pattern + method`, redacts dynamic segments, and flags RPC, polling, real-time, and telemetry patterns. Output is capped at 500 rows / 50KB; split `TRUNCATED` results before publishing.
   - Read official / API / integration docs when available. Separate `observed`, `documented`, and `inferred` claims.
   - Map competitor UI fields to target backend fields. Preserve existing target API contracts unless the user asks to redesign them.
   - Identify missing endpoints, third-party integrations, auth / permissions, file upload / storage, background jobs, async completion (polling / webhook), billing / quota, rate limits, and persistence / history.
   - Classify every state as local-only, session-only, account-persistent, workspace / project-persistent, or shared / collaborative. Folders, collections, moved item assignments, reactions, favorites, hidden / archived state, saved filters, and history usually need backend persistence unless explicitly scoped as local.
   - For every account / workspace state in the Control Intent Ledger, name the single state owner and all affected regions. Do not allow split-brain behavior where a generator control, saved-item picker, results list, and workspace / folder view each keep separate copies of the same selection or assignment.
   - If persistence matters, include migrations / schema changes, ownership checks, RLS / permission policy, read API, mutation API, hydration strategy, fallback behavior, and rollback path. Do not call a state replicated if it disappears on refresh, server restart, origin / port change, or a second device.
   - Check SSR / hydration risk for client-derived state: visible counts, selected folders / workspaces, filters, timestamps, random values, locale formatting, and environment branches must not make server HTML disagree with the client. Seed state from the server, gate client-only rendering, or render stable placeholders.
   - Never delete product features because an API or integration is missing. Mark the gap, search docs when allowed, and propose the backend / API preparation needed.

7. **Model data and architecture**
   - Draft core entities suited to the competitor's domain. Adjust to product type: SaaS, e-commerce, content, collaboration, AI tool, marketplace, internal tool, etc.
   - Output ER and status-machine diagrams when data or async tasks matter.
   - Recommend architecture only after API and data needs are known: frontend framework, server / API layer, queue, database, object storage, cache, auth, billing, third-party integrations, observability.
   - Cross-check data entities against region state ownership. If a region owns durable state, identify where that state is stored or mark it as a target-side requirement.
   - For list / workspace / collection experiences, model containers and membership explicitly: folders / workspaces / collections, item assignments, item feedback, filters, sort order, pagination, archived / deleted states, and history retrieval.

8. **Reflect and verify coverage** *(mandatory before step 9)*
   - Run [references/coverage.js](references/coverage.js) against each per-page inventory: `node references/coverage.js audit/<site>/snapshots/<date>/<page>-inventory.md [--threshold=90]`. It rejects missing/truncated enumeration metadata, invalid thresholds, duplicate IDs, below-threshold coverage, and un-probed rows lacking `blocked: <reason>`. Blocked rows may support a blocker/research report, but never make an implementation-ready gate green.
   - If coverage.js exits non-zero, return to step 4 against the IDs it listed; do not advance to step 9.
   - Ask explicitly: *"Given this product category, what are the three things I am most likely to have missed?"* Write the three candidates down — common blind spots: post-success states, error recovery paths, settings / preferences, history / undo, sharing / export, mobile-only affordances, paid-tier hints visible to free users, destination-surface mismatches, list-loading underflow, menu geometry, and oversized control stacks — then probe each and record the result.
   - Re-check the inventory against the rendered DOM after the final state. Any new elements added by interactions (modal contents, drawer contents, expanded panels) must be enumerated and probed.
   - Re-check the region model: every major region has a purpose, owned/consumed state, emitted events, Region Layout Constraints, and at least one relationship or an explicit `not applicable` reason.
   - Re-check the Control Intent Ledger: every non-trivial control has an observed competitor outcome, target implementation requirement, auth / persistence classification, cross-region effect, and test or browser evidence. Any row missing one of those fields must stay in the gap list.
   - Record results in the deliverable's *Interaction Coverage* and *Region Model Coverage* sections. Only after this round may you proceed to step 9.

9. **Produce PRD and plan implementation**
   - For implementation-ready work, write a Replication PRD using [references/prd-template.md](references/prd-template.md). The PRD is the handoff artifact; the audit report is evidence.
   - Convert the region model into region contracts: visible conditions, layout constraints, state ownership, consumed state, emitted events, update targets, UI requirements, behavior requirements, and acceptance criteria.
   - Convert cross-region dependencies into interaction contracts with stable IDs (`C1`, `C2`, ...). Each contract must name trigger region, trigger event, target region, state change, API/data dependency, and acceptance.
   - Turn the audit into a parity matrix: competitor behavior, target implementation, API mapping, readiness, risk, acceptance criteria.
   - Convert Control Intent Ledger rows into PRD requirements for controls, pickers, saved-item flows, and result-routing behavior. If a control changes where generated / submitted items land, acceptance criteria must prove the selected destination is applied to the created item and visible in the destination region.
   - Prioritize by user workflow impact: primary path first, then result / post-action behavior, history, secondary pages, SEO / support pages.
   - Split work into "can implement now" and "needs API / integration / data preparation"; do not present blocked backend work as ready.
   - If implementing from the audit, re-check the target UI against the same Control Intent Ledger after changes. A control only passes when it reaches the expected destination surface and changes the expected visible, persisted, or submitted state.
   - Verification follows the target repo's existing conventions (CLAUDE.md / test framework). For new interaction behavior, add at least a happy-path test and a payload-contract test before merging.
   - Verify with build / typecheck / lint, screenshots, DOM checks for overflow / responsive behavior, API contract checks, persistence checks, hydration checks, and at least one state-transition test for the original parity miss.
   - **Reverse-audit the built replica against the source, feature by feature.** Open both and, for every control, confirm it: (a) exists, or is honestly absent — no dead stub, no phantom extra; (b) behaves identically when you actually *trigger* it (open the dialog, toggle, expand the cascade), not just renders; (c) contains the same full content at every depth; (d) is gated the same way (auth / plan / quota / data). A stub, a guessed behavior, an extra the source lacks, or shallow content is a parity miss — fix it before claiming done. Audit completeness on the source does not certify the replica.

## Parity Review References

For implementation-ready audits, load [references/parity-trap-ledger.md](references/parity-trap-ledger.md) before probing controls and [references/parity-checklist.md](references/parity-checklist.md) during steps 3–8. Those references own the detailed miss classes; do not duplicate them into the working context unless a row is relevant.

Hard gates:

- Do not guess authenticated or interactive behavior.
- Do not ship dead stubs or phantom features.
- Enumerate complete menu, list, mode, and responsive depth within the declared scope.
- Observe or explicitly block destination, persistence, backend, and cross-region effects.
- Reverse-audit the target against the source before declaring parity.

## Configuration

Defaults are tuned for the common case. The user may override any in their request; read overrides before step 1 and state the final values in the report.

| Knob | Default | When to override |
| --- | --- | --- |
| Cache window | 30 days | Drop to 7 days for fast-moving SPAs / weekly-deployed products; raise to 90 days for stable enterprise tools. `--fresh` disables reuse for this run. |
| Coverage threshold | 90% | Raise to 100% for high-stakes audits. A lower threshold is allowed only for explicitly scoped research and must be recorded; implementation-ready output still fails whenever the configured threshold is missed. |
| Evidence directory | `./audit/<site-slug>/` | Honor a custom path only after proving its raw root is outside Git or ignored by its containing worktree. |
| Differentiation direction | (must be specified or assumed) | `workflow parity with original style` / `same features with target design system` / `research only`. |
| Viewport set | `desktop-1440`, `mobile-iphone14` | Add `tablet-ipad`, larger desktop, or specific device profiles when the product targets them. |
| Reflection round size | 3 candidates | Raise to 5+ for unfamiliar product categories. |
| PRD required | true for implementation-ready audits | Disable only for research-only or quick audits. |

## Troubleshooting And Output Budget

When tooling, cache, auth, coverage, layout, or output limits fail, load [references/troubleshooting.md](references/troubleshooting.md). Never bypass the safety boundary or mark truncated evidence complete.

## Output

Pick by depth:

- **Quick audit** (≤ 1h, single page or single workflow): use [quick-audit-template.md](references/quick-audit-template.md).
- **Implementation-ready audit**: use [output-template.md](references/output-template.md) and [prd-template.md](references/prd-template.md).
- **Region modeling**: use [region-model-template.md](references/region-model-template.md) for every implementation-ready audit.
- **Coverage self-check** during Workflow steps 4–8: load [parity-checklist.md](references/parity-checklist.md).

Every deliverable, regardless of depth, must include:

- Evidence summary with screenshot paths and source URLs.
- Raw interactive inventory (`audit/<site-slug>/snapshots/<date>/<page>-inventory.md`) with stable IDs; any published copy is separately sanitized.
- Interaction coverage block: `enumerated N · probed M · coverage M/N (X%)` plus hidden-state pass status and reflection-round results.
- Page region relationship model with `Z*` IDs, ownership, dependencies, emitted events, updates, Region Layout Constraints, responsive behavior, and source/confidence.
- UI / component inventory.
- Interaction behavior matrix.
- Control Intent Ledger covering primary, secondary, icon-only, picker, saved-item, and result-routing controls.
- API / backend mapping table (or `no backend work in scope` if research-only).
- Replication PRD for implementation-ready audits, with region contracts and cross-region interaction contracts.
- Prioritized gap list separating "can implement now" vs "needs API / integration / data preparation".
- Verification checklist.
