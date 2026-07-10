# Troubleshooting And Output Budget

Load this reference only when an audit hits one of these conditions.

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| No browser automation; only static fetch works | Interactions cannot be observed | Mark interactions `inferred`, set coverage to 0% with reason `no browser automation`, and label the result research-only. |
| `dom-enumeration.js` finds fewer than five controls on a non-trivial page | Shadow DOM or iframe boundary | Open shadow roots are traversed. Re-run inside same-origin frames; mark cross-origin frames and closed roots `blocked: inaccessible browser boundary`. |
| Enumeration reports `TRUNCATED` | The row or byte cap was reached | Narrow `rootSelector`, split the surface into regions, and enumerate each region. Never use truncated evidence for complete coverage. |
| Cache hit but live UI differs from the screenshot | Redesign inside the cache window | Force a fresh capture and record the previous capture date in `MANIFEST.md`. |
| No Fetch/XHR request appears for a remote action | WebSocket, SSE, or beacon transport | Inspect all network types, including WS frames. Record the observed transport. |
| A feature requires authentication | Behavior is behind login | Use an approved existing browser session or a fresh dedicated profile in which the user logs in directly. Never copy a browser profile or accept credentials, cookies, tokens, session exports, or magic links. |
| Coverage is below its configured threshold | Scope is incomplete | Return to unprobed inventory IDs. The validator fails below threshold even when blockers are documented; blocker reports remain research-only. |
| Reflection finds no concrete misses | Existing report content has saturated review | Select the first three unticked items in `parity-checklist.md` and probe them. |
| Regions have names but no relationship | Layout labels replaced responsibilities | Rewrite them as input/config, output/result, history/restore, and gating/auth; fill ownership, events, and updates. |
| PRD is only a gap list | Handoff requirements are missing | Convert each important region relationship into a testable requirement using `prd-template.md`. |
| Scroll-to-load never appends rows | Wrong scroller or first batch underflow | Probe page and nested scrollers, then record wheel, sentinel, button, or auto-fill behavior. |
| A control reaches the wrong kind of destination | Destination was inferred from its label | Record and verify modal, panel, drawer, route, file, picker, external target, disabled state, or blocked. |
| Popover covers nearby controls | Missing collision or layering rule | Capture focused bounds and require desktop/mobile overlap checks. |
| Header/filter stack is too tall | Density was not measured | Record stack height, first row position, visible row count, and bottom-rail overlap. |
| Raw evidence was tracked in git | Redaction boundary was skipped | Stop tracking the raw evidence, keep `audit/` ignored, and publish only a separately reviewed sanitized subset. |

## Output Budget

The DOM helpers, `network-cluster.js`, and `coverage.js` enforce a 50 KB output limit. Other tool output must be written to an ignored file once it approaches that boundary. Any truncation marker means the evidence is incomplete.

| High-cost output | Required mitigation |
| --- | --- |
| Raw `outerHTML` | Save to an ignored file; reference its path; never return it to context. |
| Long page text | Prefer an accessibility snapshot or `dom-distill.js`. |
| Large interactive inventories | Scope by region; the hard ceiling is 500 rows and 50 KB. |
| Repeated full inventories | Keep each complete state table in the evidence file with a new `startIndex`; load only metadata, diffs, and counts into context. |
| Large network cluster reports | Split request input by host/page/flow; the hard ceiling is 500 rows and 50 KB. |
| Large coverage reasons | Keep reasons specific and redacted; the report bounds each reason and the whole output to 50 KB. |
| Multi-page aggregation | Summarize each page and retain paths/counts rather than full bodies. |

`dom-distill.js` ignores page-owned option globals, omits free-form text/form values by default, strips sensitive path/query data, and clamps traversal/output limits. For a known-public scoped status only, require `hookInstalled: true`, read `hookName`, then call `window[hookName]({ rootSelector: '#status', includeText: true })`. If the hook cannot be installed, use screenshot/accessibility evidence. `dom-enumeration.js` uses the same agent-installed-hook pattern for scoped/repeated runs.
