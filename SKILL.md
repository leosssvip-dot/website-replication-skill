---
name: website-replication-skill
description: Audit a reference website or web app and produce a differentiated parity plan with page region relationships, PRD requirements, UI, interactions, API contracts, data model, and architecture. Use when benchmarking a competitor, replicating a legacy or partner site, matching product capabilities, reproducing workflow behavior with original branding, or auditing missing UI/function/API details.
metadata:
  version: 0.6.0
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

## Fidelity Is Behavior-First And Two-Directional

A thorough audit document is not parity. The four rules below are post-mortem lessons — each is a real miss the human had to catch after a "complete" audit shipped. They override the temptation to call a feature done because it looks done.

- **You cannot replicate what you did not observe — never guess an interactive feature.** Static fetch, public/landing/marketing pages, and first-render DOM cannot reveal post-login, client-side, interactive behavior: what a *Share* / *Favorite* / *More* / *Download* control actually DOES, the dialog it opens, the cascade it expands, the link it produces. `WebFetch` and HTML snapshots see *none* of this. To replicate any interactive or auth-gated feature you MUST drive the **logged-in** product and trigger the feature itself, capturing the real dialog / flow / result. If you cannot reach that state, **pause and ask the user to log in for you** (see *Reaching Logged-In State*) before settling for `blocked`; never replicate from a guess — a plausible guess ("Share copies a link") is the most expensive miss because it looks finished and ships unreviewed.
- **Capture full content and full depth — a representative sample is a content gap.** A multi-level category → sub-category cascade with dozens of entries is *not* replicated by a handful of top-level items. Expand every menu / cascade / list to its deepest level and record EVERY item at EVERY level. Shipping a token sample as the real thing reads as "done."
- **Reverse-audit your replica against the source — fidelity runs both ways.** The audit covers the *source*; it never catches what your *build* got wrong. Two failure directions, both real:
  - **Under-build (dead stub):** a control that looks replicated — a tab, a kebab item, a toggle, a secondary panel — but has no wiring and no backend. Ship it functioning *exactly* like the source, or omit it. Never ship a shell that merely looks real.
  - **Over-build (phantom feature):** a control or whole feature the source does NOT have, added speculatively. Replicate what exists; add nothing the source lacks. Flag extras and remove them.
- **A replicated front-end trigger is not done until its data and backend dependency are.** A detail / preview action needs its underlying data actually fetched and stored; a gated action (license, upgrade, export, paid download) needs its entitlement / subscription / quota check; a share action needs the public surface the link points to. A trigger wired to absent data (greyed out, empty, or a dead / raw link) is a miss. Trace each feature's data + backend dependency and verify it works with real data across states — not just that the button renders.

## Reaching Logged-In State — Pause And Hand Off To The User

The behavior most worth replicating (dialogs, gated actions, account / workspace state, post-submit flows) usually lives *behind login*. When an in-scope state is auth-gated and you lack access, the move is NOT to jump straight to `blocked` — it is to **pause and ask the user to authenticate for you**, then resume. A user signing into their own legitimate account is not auth-bypass; it is the normal way to reach the state. Mark `blocked` only when the user declines, cannot reach it, or it is a paid / private tier they do not have.

1. **Batch the ask.** Before pausing, list every logged-in state / flow you need (share dialog, favorites, gated download, post-submit result, …) so a single login covers them all — do not pause once per feature.
2. **Pause and hand off.** Ask the user to put you in front of the signed-in product and confirm when it is ready. Never ask for, type, or store the user's password — the *user* authenticates; you only observe.
3. **Resume and capture.** Drive the logged-in session, trigger each feature, classify the evidence `observed`. Redact session artifacts (cookies, tokens, account IDs) per *Evidence Safety*.
4. **Fallback.** If the user cannot or will not hand off access, mark those states `blocked`, fill what you can from public docs (`documented`), and flag the parity risk explicitly — do not guess the hidden behavior.

Handoff mechanics — use whichever the harness and user allow; all keep the user in control of their own credentials:

- **User's signed-in browser over CDP (preferred).** The user is already logged in; you connect to their browser's remote-debugging port and drive it. Browsers refuse remote debugging on the *in-use default profile*, so the common form is: copy the user's browser profile to a temp dir, launch *that* with a debug port (it carries the existing login), connect, drive, then delete the temp copy. The user owns the session; you never see the password.
- **Session handoff into a throwaway context.** The user supplies an authenticated session (a one-time magic link, or a session they mint) into a fresh browser context. Treat it as a secret — use it, never persist or log it.
- **User-drives, you-observe.** If automation cannot reach it, the user clicks through while you capture (screen-share or screenshots they provide). Slower, still `observed`.

## Out Of Scope

- Legal / IP / ToS compliance judgement. Flag risk, do not make a legal call. Recommend the user consult counsel for trademark, patent, or ToS questions.
- Performance benchmarking, SEO ranking, or marketing-channel analysis. Not feature parity. Use a dedicated skill.
- Pure visual inspiration ("their UI feels nicer"). This skill assumes you want behavior + structure parity, not just a style guide; reach for a lighter style-extraction tool instead.
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
  audit/**/*.md
  audit/**/*.txt
  audit/**/*.log
  audit/**/*.csv
  !audit/**/MANIFEST.md
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
- Desired output depth: quick audit, implementation-ready audit, or PRD handoff.

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
   - Split the page into named regions early (shell / sidebar, primary work area, secondary panel, bottom action rail or player, global overlays) and note how each region affects the others. Do this even if step 3 will formalize the model later.
   - Capture desktop and mobile screenshots only for URLs that missed the cache. Prefer full-page screenshots plus focused component screenshots.
   - Save redacted evidence: screenshots, control inventories (buttons / inputs / links), network calls, console errors, and a **structural DOM snapshot**. For the DOM snapshot pick *one* of: (a) the browser-MCP's built-in accessibility-tree tool (e.g. `take_snapshot` on chrome-devtools-mcp) when available; (b) [references/dom-distill.js](references/dom-distill.js) — a paste-ready script that emits a markdown outline 50–100× smaller than raw `outerHTML`, with framework noise stripped; (c) raw `outerHTML` only if neither is reachable, saved to file and never reloaded into context. Never `evaluate` `document.documentElement.outerHTML` directly into the agent's context — that's the single largest token-cost vector this skill warns about. Network traces are always fresh — never reused, never read from old dates.
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
   - **Enumerate first, click second.** Run [references/dom-enumeration.js](references/dom-enumeration.js) via the browser-MCP eval call (or paste into DevTools console). Save the markdown output to `audit/<site-slug>/snapshots/<date>/<page-slug>-inventory.md`, following [references/inventory-template.md](references/inventory-template.md). The script handles selector priority, shadow-DOM piercing, and `cursor:pointer` detection — do not re-invent the enumeration logic.
   - Walk the inventory by ID. First map each row to a `Z*` region. Then fill in `Probed` (`✓` clicked / `o` observed-by-URL-or-attribute / `✗` skipped), `Result` (action + outcome + network call observed + `observed` / `inferred` / `blocked` tag), and `Notes`. Do not skip an ID without writing a reason in `Result`.
   - For every primary, secondary, and icon-only control, update the Control Intent Ledger. A control is not "replicated" until its trigger, destination UI, current-state label, create / select / clear / restore behavior, persistence class, and downstream result effect are either implemented, intentionally different, or marked blocked.
   - Verify destination correctness, not just that something happened. For view, preview, open, use, download, share, and navigation controls, record whether the reference opens an in-place modal, side panel, drawer, route, file, picker, external destination, or disabled state, and whether that destination supports the current workflow.
   - **For each non-trivial state change** (modal open, drawer expand, mode switch, post-submit), run [references/dom-distill.js](references/dom-distill.js) before and after, then diff with [references/state-diff.js](references/state-diff.js): `node references/state-diff.js before.md after.md`. The diff output goes into `Result` — replaces ad-hoc narration with deterministic added/removed lists.
   - Open every menu and submenu: kebab / ellipsis menus, action dropdowns, filter menus, sort menus, bulk-action menus, move / folder pickers, download submenus, and remix / edit follow-up menus.
   - For picker-like controls (save-to, restore, saved items, source selectors, folder / workspace / collection pickers), verify the full picker contract: logged-out gate when applicable, logged-in open behavior, option list, current selection, select / create / clear actions when present, close / outside-click behavior, persisted label after refresh, and effect on the next submitted or moved item.
   - Verify popover mechanics: outside-click dismissal, escape / close behavior if present, disabled menu items, destructive menu items, nested submenu positioning, viewport clipping, mobile placement, and whether parent / sibling controls remain visible and usable while the popover is open.
   - Treat icon-only and visually-decorative-looking controls as functional until proven otherwise. Save / clear / copy / expand / randomize / regenerate / share / more — probe each individually.
   - For each interaction also record: validation, disabled state, loading state, optimistic update, error, success output, post-submit action, auth / permission redirect, paywall / quota behavior, and mobile sticky behavior.
   - Probe selection and bulk behavior when lists exist: row checkbox placement, select-all state, selected-count actions, bulk move / download / delete affordances, and how selection interacts with filters and pagination.
   - Probe pagination, infinite-scroll, and scroll-to-load as state machines: initial batch size, "N of M" status text, page / nested-scroll ownership, wheel / touch / sentinel / button trigger, loading indicator, terminal state, and reset after search, filter, sort, or container changes. If more items are announced but no trigger loads them, keep the behavior in the gap list.
   - Probe global controls separately from row controls: global players, persistent action bars, sidebars, bottom CTAs, floating helpers, and fixed footers often have independent state and must not cover primary CTAs, list content, pagination, or mobile bottom navigation.
   - If the page is dynamic, re-run the enumeration script after each major state change (mode switch, modal open, post-submit). Before re-running, set `window.__websiteReplicationInventoryOptions = { startIndex: <next unused numeric ID> }` so appended rows do not reuse IDs. Append the new rows below the existing ones with a `<!-- After <state change> -->` divider.

5. **Probe hidden states**

   Run each pass once per primary page; mark `not applicable` for any that genuinely don't apply. Skipping this step is the #1 source of parity gaps.

   - **Hover / focus**: tab through every focusable element and hover every interactive element; capture revealed tooltips, popovers, secondary actions, helper text.
   - **Keyboard shortcuts**: at minimum try `?` (help overlay), `/` (search focus), `ctrl/cmd+k` (command palette), `esc` (modal / drawer close), `enter` (submit), arrow keys (list nav), `tab` order and traps, undo / redo.
   - **Right-click / long-press**: try the primary content area, list items, and any rich-content surface for custom context menus.
   - **Drag / drop / reorder**: try repositioning list items, files, cards; record the reorder API and any cross-container moves.
   - **Scroll-triggered**: scroll to bottom (infinite scroll, lazy load, sticky CTA, "back to top"); scroll within nested containers; probe underfilled and overflowing list states; mobile bottom-bar appearance.
   - **Input edge cases**: empty submit · max length · paste of formatted content · paste of disallowed chars · IME composition · disabled-state attempts.
   - **Network states**: throttle to slow 3G and capture skeletons / spinners; toggle offline and capture error UX; force a 5xx (DevTools "Network → Block" + replay) and capture recovery affordance.
   - **URL / history**: deep-link directly into a state · back / forward across modes · refresh mid-flow · open in new tab from a list item.
   - **Multi-window / cross-tab**: where state is shared (carts, drafts, notifications), open a second tab and probe sync direction.

6. **Audit API and backend capability**
   - Capture observed network calls with method, route pattern, headers / auth class, redacted payload shape, response shape, status code, error class.
   - Run [references/network-cluster.js](references/network-cluster.js) over the captured request list: `node references/network-cluster.js requests.txt`. The script clusters by `host + path-pattern + method`, generalizes IDs / UUIDs / tokens, and flags RPC-batched endpoints (carrying `rpcids` or similar sub-keys), likely polling, real-time channels, and telemetry hosts. Use its output as the first draft of the *Observed endpoints* table — verify each cluster manually before publishing.
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
   - Run [references/coverage.js](references/coverage.js) against each per-page inventory: `node references/coverage.js audit/<site>/snapshots/<date>/<page>-inventory.md [--threshold=90]`. The script parses the `Probed` column, counts `✓` / `o` / `✗`, computes coverage, and **exits non-zero** if coverage < threshold and any un-probed row lacks a `blocked` reason. This is the formal gate — agent self-reporting is not.
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

## Common Misses To Prevent

- Guessed-not-observed behavior: any interactive/auth-gated feature implemented without driving the logged-in source and triggering it — `Share`, favorite, gated downloads, "More" cascades. See *Fidelity Is Behavior-First And Two-Directional*.
- Phantom features: a control or feature added that the source does not have (the inverse of replication). Build only what exists.
- Content-depth shortfall: cascades / menus / lists replicated with a representative sample instead of every item at every level.
- Dead stubs in the replica: a tab / menu item / toggle that looks replicated but has no wiring or backend — wire it like the source or omit it.
- Icon-only buttons with no behavior: clear, save, randomize, expand, copy, download, regenerate, share, more.
- Static confirmation replacing a real interaction: a reference button that opens a picker, saved-item menu, folder selector, source chooser, restore dialog, or modal cannot be replicated by showing a text note or toast.
- Auth-only probing: logged-out gates are not enough. If logged-in access is available, verify the authenticated behavior and current-state label for the same control.
- Mode-specific omissions: Prompt / custom-content / upload / restore modes can have different controls, persistence, CTA states, and result routing; enumerate each mode after switching.
- Menus that look right but do not model the product: ellipsis actions, nested downloads, remix / edit follow-ups, move-to dialogs, sort menus, filter menus, bulk menus, disabled destructive actions, and outside-click dismissal.
- Destination mismatch: a view / preview / open / use control navigates somewhere, but the reference opened a modal, side panel, drawer, picker, file, or disabled state tied to the current workflow.
- Menu geometry mismatch: nested or adjacent popovers exist but cover parent actions, row controls, CTAs, pagination, or mobile navigation.
- Picker contract gaps: missing option list, create/select/clear actions, current selection disabled state, outside-click / escape behavior, mobile placement, refresh persistence, or downstream assignment to the generated / moved item.
- Shared-state split brain: generator selection, saved-item picker, workspace list, folder breadcrumb, result row, and history rail disagree about the active workspace / folder / saved content.
- Hidden state changes: selected tabs, mode switches, advanced toggles, uploaded / selected source state, draft / restore state.
- Region replacement after workflow progress: examples / showcases may disappear once user content exists; result panels may switch into task lists, history, folders, queues, or workspaces.
- User feedback: character counters, saved / restored notices, disabled reasons, validation text, empty states, loading / progress, error recovery.
- Result / post-action: download, save to library, edit / extend, share, metadata, related items, source attribution.
- Layout ownership: panels that page-scroll instead of internally scrolling, sidebars without fixed bottom account / upgrade areas, global players that cover primary CTAs, sticky footers not aligned across columns, panels stacking too early, oversized header / control stacks, and lists that stretch page height.
- Inconsistent row states: pending rows, completed rows, failed rows, selected rows, and active-playing rows must share the same information architecture unless the competitor clearly separates them.
- Missing list semantics: select-all, row checkbox placement, selected-count menus, pagination, scroll-to-load / infinite-scroll trigger, batch size, visible-count label, filter summaries, reset controls, and sort icons / direction.
- Scroll-to-load underflow: the first batch does not fill the scroll container, so an `onScroll`-only implementation never reaches the loading trigger even though the status says more items exist.
- Persistent-state mismatch: folders, moved items, likes / dislikes, saved filters, history, and user preferences implemented as local-only state when they should be account / workspace data.
- Hydration mismatch: client-only localStorage, random values, dates, locale formatting, or environment branches changing visible counts / labels between server render and client render.
- Backend mismatch: UI fields not sent, sent fields not documented, fake enabled buttons for unsupported APIs, missing auth / quota / polling / webhooks, missing migrations / RLS / ownership checks for new persisted state.
- Browser automation false positives: clicking by visible text can hit the wrong helper, example, or hidden duplicate. Scope interactions by region, role, inventory ID, and exact control label before accepting evidence.
- Mobile details: sticky CTA, bottom nav, no horizontal overflow, toolbars wrapping cleanly, text fitting inside controls, hit-target sizing.
- Layout constraints: sticky / fixed / docked regions, independent scroll containers, overlay vs reserved-space behavior, z-layer and backdrop rules, safe-area insets, keyboard avoidance, and collision with bottom nav / FAB / toast / cookie bars.
- Hover-only reveals, keyboard shortcuts (`?` / `/` / `ctrl+k`), right-click menus, drag-and-drop reorder — invisible without the step-4 hidden-states pass.
- Network failure UX, offline state, slow-network skeletons — invisible until DevTools is throttled.
- URL / history behavior: deep-link, refresh mid-flow, back / forward across modes — invisible without navigating.
- Region relationship gaps: input panel and output panel documented separately but no state/event contract between them; history or selection panels not mapped back to the editor/form/result regions.
- PRD gaps: audit findings listed without implementation requirements, acceptance criteria, region contracts, responsive rules, or testable cross-region interactions.

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
| PRD required | true for implementation-ready audits | Disable only for research-only or quick audits. |

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| No browser MCP available — only static fetch works | Skill cannot observe interactions | Continue, but mark every interaction `inferred`, set Coverage = 0% with reason "no browser automation", and warn the user the result is research-only. |
| `dom-enumeration.js` returns < 5 elements on a non-trivial page | SPA renders into shadow DOM or iframes; selectors miss them | The script pierces open shadow roots; cross-origin iframes are inaccessible by design. For same-origin iframes, re-run inside each frame's context. Closed shadow roots are unreachable — mark `inferred`. |
| Cache hit but the live page visibly differs from the stored screenshot | Site was redesigned within the cache window | Force fresh for this row; update `Last Captured` and add MANIFEST note "redesigned since <previous date>". |
| Network panel shows no requests for an obviously remote action | Call uses WebSocket, Server-Sent Events, or `navigator.sendBeacon` | Switch DevTools to "All" not "Fetch/XHR"; capture WS frames; tag as `observed (via WS)` or `observed (via beacon)`. |
| Authenticated state required to observe a feature | Behavior lives behind login | **Pause and ask the user to log in for you** (see *Reaching Logged-In State*), then drive their signed-in session. Mark `blocked` only if they decline / cannot, or it is a paid / private tier they lack. Never bypass auth or handle their password. |
| `MANIFEST.md` missing on first run | Expected — no prior audit | Create with the header from [references/manifest-template.md](references/manifest-template.md); append rows as you capture. |
| Coverage below 90% with no `blocked` reason | Step 4 was skipped or rushed | Return to step 4 against the unfilled IDs; do not submit the deliverable yet. |
| Reflection round (step 8) produces no concrete misses | Agent saturated on existing report content | Use [references/parity-checklist.md](references/parity-checklist.md) "Hidden States And Coverage" — pick the first three items still unticked. |
| Region model says "left panel / right panel" but no relationship | Agent labeled layout instead of responsibility | Rewrite regions as responsibilities: input/config, output/result, history/restore, gating/auth. Fill ownership, dependencies, events, and updates. |
| PRD is a gap list, not a build spec | Output template used without PRD handoff | Load [references/prd-template.md](references/prd-template.md) and convert every important region relationship into a testable requirement. |
| Scroll-to-load status says more items exist, but no rows load | Listener is attached to the wrong scroller, the first batch does not overflow, or the intended trigger was never observed | Probe page and nested scroll containers with wheel / touch / sentinel / button triggers; add a fallback or auto-fill behavior to the target plan and keep the gap until rows actually append. |
| A control opens a destination, but the workflow still feels wrong | Destination type was inferred from the label instead of observed | Record the destination class in the Control Intent Ledger: modal, panel, drawer, route, file, picker, external target, disabled state, or blocked. Require target verification for the same destination class or an explicit accepted difference. |
| Popover or submenu covers nearby controls | Missing anchor, collision, width, or layering rule | Capture a focused screenshot and bounds; add collision behavior to Region Layout Constraints and require desktop / mobile overlap checks. |
| Header or filter area consumes too much vertical space | Density and visible-row budget were not measured | Record control-stack height, first visible row position, visible row count, and footer / bottom-rail overlap for desktop and mobile. |
| Screenshots tracked into git accidentally show PII | Reviewer skipped the redaction pass | Untrack with `git rm --cached <path>`, sanitize, re-commit. See *Evidence Safety*. Long-term: switch the consumer project's `.gitignore` block to the single `audit/` line. |

## Token Budget

A full audit's tool outputs share the agent's context window. Per-call costs that look small can compound when an audit spans many pages or many state changes. Honest order of impact:

| Worst → best to watch | What it looks like | Mitigation |
| --- | --- | --- |
| 1. Raw `outerHTML` via `evaluate` | one call returns 200KB – 5MB of HTML | Forbidden — save to file, reference path, never load whole HTML into context |
| 2. `get_page_text` / raw-text extraction on long pages | docs / Terms / changelog returns 50–200KB | Prefer the browser-MCP a11y snapshot, else run [references/dom-distill.js](references/dom-distill.js) |
| 3. Inventory blowup on giant lists | 1000+ interactive elements (data tables, kanban) | `dom-enumeration.js` caps at 500 by default; lower to 200 or scope to `rootSelector` of the working region |
| 4. Re-enumeration without diff | each state change re-emits the full inventory | Set `window.__websiteReplicationInventoryOptions = { startIndex: <next unused numeric ID> }`, append only the *new* rows with a `<!-- After <state> -->` divider, and do not repeat rows already recorded |
| 5. Multi-page audit aggregation | loading 10 inventories back into context | Stream + summarize per page; keep paths and counts, not bodies |

Hard rule: **any single tool output > 50KB must be written to a file and referenced by path**, not held in context.

What's already enforced by the skill's artefacts:

- `dom-enumeration.js`: `limit=500` rows · `startIndex` for appended state inventories · stable CSS-path fallback selectors · 60-char label truncation · no `outerHTML`.
- `dom-distill.js`: `maxNodes=2000` · `maxDepth=10` · drops `<script>` / `<style>` / SVG primitives · collapses wrapper divs · 60-char text truncation · 80-char attribute truncation.
- Screenshots and DOM dumps live as files; the deliverable references them by path.

## Output

Pick by depth:

- **Quick audit** (≤ 1h, single page or single workflow): use [quick-audit-template.md](references/quick-audit-template.md).
- **Implementation-ready audit**: use [output-template.md](references/output-template.md) and [prd-template.md](references/prd-template.md).
- **Region modeling**: use [region-model-template.md](references/region-model-template.md) for every implementation-ready audit.
- **Coverage self-check** during Workflow steps 4–8: load [parity-checklist.md](references/parity-checklist.md).

Every deliverable, regardless of depth, must include:

- Evidence summary with screenshot paths and source URLs.
- Interactive inventory (`evidence/interactive-inventory.md`) with stable IDs.
- Interaction coverage block: `enumerated N · probed M · coverage M/N (X%)` plus hidden-state pass status and reflection-round results.
- Page region relationship model with `Z*` IDs, ownership, dependencies, emitted events, updates, Region Layout Constraints, responsive behavior, and source/confidence.
- UI / component inventory.
- Interaction behavior matrix.
- Control Intent Ledger covering primary, secondary, icon-only, picker, saved-item, and result-routing controls.
- API / backend mapping table (or `no backend work in scope` if research-only).
- Replication PRD for implementation-ready audits, with region contracts and cross-region interaction contracts.
- Prioritized gap list separating "can implement now" vs "needs API / integration / data preparation".
- Verification checklist.
