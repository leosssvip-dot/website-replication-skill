# Parity Trap Ledger

Use this ledger when an audit needs implementation-ready parity, when a user says the replication must be careful, or when a previous pass missed controls, persistence, or mode-specific behavior. It is a no-PII artifact: record generic route patterns, redacted payload shapes, screenshots paths, and inventory IDs only.

The goal is to prevent "looks present" from being mistaken for "works like the reference." Every meaningful control must answer: what does it do, what state does it read/write, where is that state stored, which regions update, and how will the target prove it?

## Control Intent Ledger

Add this table to the audit report or link it from the report.

| Control ID | Region | Visible Affordance | Observed Trigger | Complete Observed Outcome | Auth States | Persistence Class | Backend / API Mapping | Cross-Region Updates | Post-Submit / Result Effect | Target Requirement | Test / Browser Evidence | Remaining Gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| i000 | Z1 | Save to... picker | click button | opens folder picker, shows current destination, selecting changes label | logged-out gates; logged-in opens | workspace-persistent | read folders; update draft destination; submit uses destination id | Z1 label, Z2 workspace list, Z3 breadcrumb | new result appears in selected destination | implement picker, not a static notice | component test + desktop/mobile browser check | none / blocked |

## Minimum Acceptance By Control Type

### Destination / routing controls

- The observed destination class is recorded: in-place modal, side panel, drawer, route, file download / preview, picker, external target, disabled state, or blocked.
- Navigation is not enough evidence by itself. Verify that the destination supports the same user workflow and exposes the expected next actions.
- If the target intentionally uses a different destination class, record the accepted difference and add verification for the changed workflow.
- "View", "preview", "open", "use", "share", and compact icon buttons must be scoped by inventory ID and region before accepting the result.

### Picker / selector controls

- Logged-out behavior is observed separately from logged-in behavior when access is available.
- Opening behavior is verified: popover, modal, drawer, sheet, command menu, or inline list.
- Option list is verified, including empty, disabled, selected, search / filter, create, clear, and cancel states where present.
- Current selection is visible and survives refresh when the reference treats it as durable.
- Selecting an option updates all dependent regions, not just the control label.
- Downstream actions use the selected option: generated, uploaded, moved, restored, or saved items land in the chosen destination.
- Close behavior is verified: outside-click, escape, explicit close, route change, and mobile placement when applicable.

### Saved content controls

- Save and restore / saved-item controls are separate when the reference separates them.
- Saved data scope is classified: local-only, session-only, account-persistent, workspace-persistent, or shared.
- Durable saved content has a read path, mutation path, hydration strategy, and ownership / permission policy in the target plan.
- Restore / use actions update the correct input region and any preview / result region the reference updates.
- Deleting or clearing saved content does not silently clear current in-progress input unless the reference does that.

### Mode-specific controls

- Every tab, mode, and source type is enumerated after switching modes.
- Controls that exist only in one mode are recorded as mode-scoped, not global.
- Submit payloads are captured separately per mode.
- State preservation between modes is observed: retained, reset, copied, or blocked.
- Removed controls are only removed from the target when the reference also omits them or the difference is explicitly accepted.

### Icon-only and compact controls

- Treat every icon button as functional until proved otherwise.
- Identify intent from observed behavior, accessible name, tooltip, adjacent controls, menu contents, and network side effects.
- Do not infer a magic / boost / optimize / randomize / restore / save icon from shape alone.
- Test evidence must target the exact inventory ID or scoped role, not only visible text.

### List loading controls

- Record initial batch size, visible-count label, terminal state, and reset behavior after search, filter, sort, or container changes.
- Probe both underfilled and overflowing states when possible; an `onScroll`-only trigger can fail when the first batch does not fill the container.
- Identify the actual trigger: page scroll, nested scroll, wheel, touch, sentinel, explicit button, or automatic fill until overflow.
- If the UI says more items exist but no rows append, keep the behavior as a gap until the trigger is observed or deliberately changed.

## Common Trap Classes

| Trap | Bad Replication Smell | Prevention |
| --- | --- | --- |
| Static confirmation instead of interaction | A save-to, restore, source, or folder button only displays "saving to X" | Open the reference control and require picker contract evidence |
| Auth-only probing | Logged-out click shows login, so the logged-in flow is never checked | Probe both anonymous and authenticated states when legitimately available |
| Mode drift | Prompt mode is close, but custom lyrics / upload / saved-source mode is missing controls | Re-enumerate inventory after every mode switch |
| Icon semantics guessed | Save, dice, wand, restore, expand, or menu icons are implemented with guessed behavior | Record tooltip, DOM name, click result, state diff, and network side effect |
| Destination class guessed | A control opens a route when the reference used a modal, drawer, side panel, picker, file, or disabled state | Record destination class and require target evidence for the same class or an accepted difference |
| List-loading underflow | Status says more items exist, but first batch does not overflow so no load trigger fires | Probe underfilled and overflowing states; require append evidence or planned fallback |
| Popover geometry missed | Submenu exists but covers the parent menu, row action, CTA, pagination, or mobile nav | Capture focused screenshot / bounds and add overlap checks |
| Split-brain state | Generator destination differs from workspace breadcrumb or result list | Name one state owner and every region that consumes it |
| Local-only persistence downgrade | Saved folders, lyrics, styles, reactions, filters, or history disappear after refresh / second client | Classify persistence and plan backend / schema / hydration work |
| Result-routing miss | User selects a destination, but the created item still appears in the default list | Add acceptance proving selected destination is applied to the created item |
| Visible-text automation false positive | Browser helper clicks a similarly named card, hidden duplicate, or row action | Use inventory ID, scoped region, role, and exact accessible label |
| Console evidence overstated | Unrelated extension/resource noise is reported as clean or as app failure | Separate app errors from extension/resource noise; record unresolved noise explicitly |
| UI-only backend gap | Control exists but no target API reads/writes its state | Mark blocked or disabled until API / storage mapping exists |

## Reflection Prompts

Before finalizing, ask and answer these in the report:

- Which control did I assume was decorative before clicking it?
- Which clicked control produced a menu, modal, picker, or state change that was not in the initial screenshot?
- Which control reached a different destination class than its label implied?
- Which list shows more available items, and what observed trigger appends them?
- Which logged-in behavior differs from logged-out behavior?
- Which selected value must affect a later submit, generated item, uploaded item, or moved item?
- Which state would break on refresh, second device, server restart, or origin / port change?
- Which browser action could have clicked the wrong visible text or duplicate control?

## Verification Hooks

For any original parity miss or high-impact control, require at least one focused verification item:

- Component or integration test for open/select/close behavior.
- Payload-contract test proving selected values are submitted.
- Persistence test for refresh and fresh client where the state is durable.
- Region relationship test proving downstream regions update.
- Desktop and mobile browser check for picker placement, overflow, and close behavior.
- Manual evidence row for blocked auth / paid states, with reason and next step.
