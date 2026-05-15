# Changelog

All notable changes to this skill are recorded here. Versioning follows [SemVer](https://semver.org/): MAJOR breaks workflow contract, MINOR adds steps / templates / configurable knobs, PATCH refines wording or fixes bugs in scripts / templates.

## [Unreleased]

Planned for the next milestones — not yet implemented:

- CI: markdown lint + link checker + SKILL.md frontmatter validator on PRs.
- Migration guide for skill-version bumps when the consumer project has a cached `MANIFEST.md`.
- Add a third `Probed` state for "observed by URL / static attribute, not clicked" — surfaced during the Gemini sample run; current `✓ / ✗` collapses two distinct cases.
- A second real audit on a fully public site (no auth gating) to complement the Gemini anonymous-tier sample, demonstrating 100% coverage.

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
