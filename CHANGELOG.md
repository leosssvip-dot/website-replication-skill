# Changelog

All notable changes to this skill are recorded here. Versioning follows [SemVer](https://semver.org/): MAJOR breaks workflow contract, MINOR adds steps / templates / configurable knobs, PATCH refines wording or fixes bugs in scripts / templates.

## [Unreleased]

Planned for the next milestones — not yet implemented:

- CI: markdown lint + link checker + SKILL.md frontmatter validator on PRs.
- Migration guide for skill-version bumps when the consumer project has a cached `MANIFEST.md`.
- A second real audit on a fully public site (no auth gating) to complement the Gemini anonymous-tier sample, demonstrating 100% coverage.
- Stress-test the v0.3 scripts on diverse sites (heavy-shadow-DOM SPA, large data table, infinite-scroll feed).

## [0.5.0] — 2026-06-17

### Added — fidelity is behavior-first and two-directional (post-mortem from a real multi-feature parity miss)

A "complete" audit still shipped several parity misses of recurring shapes: replicated controls that were non-functional shells (dead stubs); a gated action that ignored its entitlement check; an interactive control implemented from a guess instead of from observing the logged-in source; a missing toggle active-state indicator; a feature the source did not have, added speculatively; and a multi-level menu replicated only one level deep with a sample of its content. Root cause: audit completeness was treated as replication fidelity, and the harness-in-use copy had drifted to a behind fork lacking the Control Intent Ledger. New guidance + a copy reconciliation close the gap:

- **New section "Fidelity Is Behavior-First And Two-Directional"** (right after Core Rule), four rules: (1) you cannot replicate what you did not observe — drive the logged-in product and trigger each interactive feature; static fetch / public pages / first-render DOM see no post-login client behavior; never guess; (2) capture full content + full depth, not a representative sample; (3) reverse-audit the replica against the source — both under-build (dead stubs) and over-build (phantom features the source lacks) are misses; (4) a front-end trigger is not done until its data + backend dependency are.
- **Step 9 verification** gains a feature-by-feature reverse-audit gate: open replica + source, confirm each control exists-or-is-honestly-absent, behaves identically when *triggered*, contains the same full content, and is gated the same way.
- **Common Misses** gains four scannable entries: guessed-not-observed behavior, phantom features, content-depth shortfall, dead stubs in the replica.
- **Copy reconciliation**: the `.claude` (Claude Code) copy had drifted behind the `.codex` (0.4.3) copy; both are now realigned to the same 0.5.0 content + `references/parity-trap-ledger.md`.

## [0.4.3] — 2026-06-05

### Changed — generic implementation feedback lessons

- Tightened the workflow around destination correctness, list-loading mechanics, popover geometry, and layout density without adding project-specific examples, product names, screenshots, or private data.
- Added underfilled and overflowing list-state probing so pagination, infinite-scroll, and scroll-to-load cannot pass when visible count text says more items exist but no trigger appends rows.
- Added implementation feedback guidance: after applying an audit, re-check the target UI against the same Control Intent Ledger and require targeted evidence for the original parity miss.

## [0.4.2] — 2026-06-04

### Added — Control Intent Ledger

- **`references/parity-trap-ledger.md`** — a "looks present ≠ works like the reference" guard. Every meaningful control must record observed intent, complete outcome, auth states, persistence class, backend/API mapping, cross-region updates, post-submit/result effect, target requirement, and test evidence before it counts as replicated. Ships minimum-acceptance rules per control type (picker / saved-content / mode-specific / icon-only), a common-trap table (static confirmation, split-brain state, result-routing miss, local-only persistence downgrade, …), reflection prompts, and verification hooks.
- Wired into the workflow and templates: `SKILL.md` steps now start and re-check the ledger; `output-template.md`, `parity-checklist.md`, and `prd-template.md` reference it so control intent flows into PRD requirements and acceptance criteria.

### Fixed — script bugs surfaced in review

- **`network-cluster.js`** — the "real-time channel" and "telemetry" detectors matched naked substrings, so ordinary routes were mislabeled: `/assets/app.js` flagged as a channel (`assets` ⊃ `sse`), and `/blog`, `/api/login`, `/catalog` flagged as telemetry (all ⊃ `log`). Keyword matching is now anchored to path-segment boundaries (`/ . _ -` or string ends, optional trailing plural), so true positives (`signaler`, `/channel`, `/collect`, `/log`) survive while the false positives are gone.
- **`coverage.js`** — a `Probed` value the parser didn't recognize (e.g. `partial`, `todo`) was silently dropped: it lowered coverage but never appeared in the actionable "un-probed" list, so the gate could read green while real rows went unprobed. Any non-`✓`/`o` marker now counts as un-probed and is named (with an `unrecognized Probed value "…"` reason when the Result cell is blank). An inventory table with a header but **0 element rows** now **fails** the gate instead of passing as "0 / 0" — an empty inventory is an enumeration failure, not full coverage.
- **`design-tokens.js`** — pure black was dropped from *all* histograms, hiding the usually-dominant text color; the palette comment claimed it filtered "pure black/white" but white was kept and the transparent test (`includes(', 0)')`) also discarded opaque colors with a zero channel (red `rgb(255, 0, 0)`, yellow `rgb(255, 255, 0)`). Black is now kept in the per-category histograms; the brand palette filters transparent + pure black + pure white, with an alpha-0 test that only fires on `rgba(...)`.

### Fixed — documentation drift

- **Step numbers** in script headers realigned to the current 9-step workflow: `network-cluster.js` `Step 5` → `Step 6`, `coverage.js` `Step 7 gate` → `Step 8 gate` (it already said "Step 8" elsewhere). Stale `step 7` reflection reference in the Gemini sample updated to step 8.
- **`inventory-template.md`** now documents the `o` `Probed` state (added in 0.3.0) in the column conventions and the coverage-reporting math (`(✓ + o) / Enumerated`), and demonstrates it with an example row.
- **README "Repository layout"** (English + Chinese) refreshed — it had omitted all six `references/*.js` scripts, `scripts/validate-skill.mjs`, `CHANGELOG.md`, `SKILL.zh.md`, and the region-model / prd / inventory / manifest templates.
- **`examples/sample-audit.md`** rewritten to the current `output-template.md` structure: it now includes a full Page Region Relationship Model (Z0–Z4 with layout constraints, dependency matrix, state contracts, stateful region matrix) and a Replication PRD handoff (region requirement index + cross-region contracts C1–C6), so the fictional walkthrough actually exercises the region-modeling workflow.

## [0.4.0] — 2026-05-29

### Added — region modeling as a first-class workflow step

- **Step 3 "Model page regions and relationships"** inserted into the workflow (all later steps renumbered): assign stable `Z*` IDs to semantic regions, capture owned/consumed state, emitted events, and cross-region dependencies.
- **`references/region-model-template.md`** — region map, region layout/containment, region dependency matrix, region state contracts, page-level state machine, and a region-modeling checklist.
- **Region Layout Constraints** — a dedicated contract (placement, anchor target, positioning mode, sizing, scroll behavior, layering/containment, responsive transform, collision rules) threaded through `SKILL.md`, `region-model-template.md`, `output-template.md`, `prd-template.md`, `quick-audit-template.md`, and `parity-checklist.md`, with `scripts/validate-skill.mjs` asserting the phrasing stays present in each.
- **`references/prd-template.md`** — Replication PRD handoff: region requirement contracts, cross-region interaction contracts with stable IDs, state machines, and a completeness checklist. PRD is required for implementation-ready audits.

### Changed

- **`scripts/validate-skill.mjs`** hardened to check the region-layout-constraint contract across all templates in addition to JS syntax and the coverage-gate behavior.
- **Parity checklist** strengthened around region relationships, persistence scope, and hidden-state coverage.

## [0.3.0] — 2026-05-15

### Added — four automation scripts that displace agent-by-hand work

- **`references/coverage.js`** (Node CLI) — formal Step 7 gate. Parses an `interactive-inventory.md`, counts `✓` / `o` / `✗`, computes coverage %, **exits non-zero** if below threshold (default 90%) and any un-probed row lacks a `blocked` reason. Agent self-reporting is no longer the gate; this is.
- **`references/network-cluster.js`** (Node CLI) — Step 5 helper. Reads "METHOD URL [status]" lines (chrome-devtools-mcp's `list_network_requests` output shape), clusters by host + generalized path pattern (IDs / UUIDs / tokens collapsed to `:id` / `:uuid` / `:token`), and flags RPC-batched endpoints (`rpcids` etc.), likely polling, real-time channels (`signaler` / `channel` / `sse`), and telemetry hosts.
- **`references/state-diff.js`** (Node CLI) — Step 3 helper. Diffs two `dom-distill.js` outputs by element signature (tag + sorted attrs), reports added / removed nodes. Replaces ad-hoc "what changed when I clicked" narration with deterministic structural output.
- **`references/design-tokens.js`** (browser) — Step 2 helper. Histograms `getComputedStyle` across visible elements, outputs top colors / fonts / sizes / radii / shadows / spacings. Includes a merged color palette and a "spacing scale guess" section. Side-effect-free.

### Changed

- **`Probed` column gains a third state**: `o` for "observed by URL / static attribute, not clicked" — surfaced as a gap during the Gemini sample run. `coverage.js` treats `✓` and `o` as covered, `✗` as skipped, separates `blocked`-reason skips from unjustified ones.
- **SKILL.md and Chinese mirror** wire the four scripts into steps 2 / 3 / 5 / 7 explicitly with command examples.

### Notes

- All Node scripts tested locally against synthetic fixtures. `design-tokens.js` is browser-only — verify when next running an audit.
- This is a MINOR bump per the CHANGELOG's own SemVer convention — new optional tooling, no breaking workflow contract change. Existing inventories without the `o` Probed state still parse correctly (treated as `✗`).

## [0.2.0] — 2026-05-15

### Added

- **`references/dom-distill.js`** — paste-ready DOM structural distiller. Produces a markdown nested-list outline of the visible page (structure + key attributes + truncated text) while dropping framework boilerplate (`<script>` / `<style>` / SVG primitives), collapsing single-child wrapper divs, and stripping noisy attributes (`class`, `jsname`, framework-specific data-*). Aim: 50–100× smaller than raw `outerHTML`. Use when the browser MCP has no built-in accessibility-tree tool, or when text content matters alongside structure. Side-effect-free.
- **Token Budget section** in SKILL.md (and Chinese mirror) — explicit ordered list of bloat sources, a hard rule ("any single tool output > 50KB must be written to a file"), and what's already enforced by the skill's own scripts (`dom-enumeration.js` limit=500, `dom-distill.js` maxNodes=2000 + multi-axis truncation).

### Changed

- **SKILL.md step 1** (and Chinese mirror) — DOM-snapshot guidance is now explicit and prioritized: (a) MCP-native a11y snapshot, (b) `dom-distill.js`, (c) raw `outerHTML` only if neither is reachable and file-only. Direct `evaluate(outerHTML)` into context is now explicitly forbidden.

### Notes

- This is a MINOR bump per the CHANGELOG's own SemVer convention — new template / configurable surface, no breaking workflow contract change.

## [0.1.1] — 2026-05-15

### Added

- **Real sample audit**: `examples/sample-audit-gemini.md` — full 10-section research-only audit of `https://gemini.google.com/app` anonymous tier, captured live via `chrome-devtools-mcp`. 49 enumerated elements, 95% coverage on meaningful interactive surface, 7 desktop + 1 mobile screenshot, 34-request network capture, all auth-gated state honestly marked `blocked`. Demonstrates the workflow end-to-end against a real high-complexity target.
- **Required-tooling callout** at top of SKILL.md naming the browser MCPs explicitly (previously only in *Tooling* mid-doc).
- **Agent-harness-agnostic framing**: README opening + new "Other agent harnesses" install section make explicit that the skill is markdown + JS + YAML, runnable on any harness that loads markdown skills with file + browser tools. Claude Code and Codex are the tested harnesses, not the only ones.
- **GitHub repo topics**: `claude-code-skill`, `claude-agent-skill`, `openai-codex-skill`, `competitive-analysis`, `web-audit`, `feature-parity`, `browser-automation`, `ui-replication`.

### Notes

- Process feedback from the Gemini run is captured at the end of `sample-audit-gemini.md` and queued in `[Unreleased]` (e.g., needing a third `Probed` state).

## [0.1.0] — 2026-05-15

First versioned release.

### Added

- **Workflow forcing functions** to reduce parity gaps:
  - Step 3 rewritten as DOM-driven enumeration via `references/dom-enumeration.js` (a side-effect-free script the agent runs in the browser; outputs a markdown table to paste into `interactive-inventory.md`).
  - Step 4 added: hidden-states pass covering hover / focus / keyboard / right-click / drag / scroll / input-edge / network / URL-history / multi-window.
  - Step 7 added: mandatory reflection + coverage gate (`enumerated N · probed M · coverage M/N`; below 90% without `blocked` reason blocks the deliverable).
- **Cross-audit screenshot reuse** via `MANIFEST.md` at `audit/<site-slug>/MANIFEST.md`. Cache window default 30 days, configurable. Network traces never reused.
- **Templates**: `references/manifest-template.md`, `references/inventory-template.md`, `references/dom-enumeration.js`.
- **Configuration section** in SKILL.md documenting cache window, coverage threshold, evidence dir, differentiation direction, viewport set, reflection round size — all overrideable per audit.
- **Troubleshooting section** in SKILL.md covering 9 common failure modes (no browser MCP, shadow DOM, stale cache, WS / SSE traffic, blocked auth, missing manifest, low coverage, empty reflection, PII leak).
- **Chinese mirror**: `SKILL.zh.md` covering Workflow, Evidence Safety, Common Misses, Configuration, Troubleshooting.
- **Bilingual README** (English default + Chinese), with explicit dependency table (Chrome MCP / Playwright MCP / Claude Preview as required; Mobile MCP / WebFetch / web-reader as recommended).
- **Consumer-project `.gitignore` snippet** in SKILL.md *Evidence Safety* — tracks PNG snapshots and `MANIFEST.md`, ignores DOM / network / reports.

### Changed

- Evidence directory layout: from per-audit dated subfolder to `audit/<site-slug>/{MANIFEST.md, snapshots/<date>/, network/<date>/, reports/<date>.md}`.
- SKILL.md frontmatter now includes `version: 0.1.0`.

### Notes

- Skill repo's own `.gitignore` is a single `audit/` line — the repo never produces audit output; tracking policy is for consumer projects.
- All workflow numbers shifted: previous 3–6 became 3–8 with new steps 4 and 7.
