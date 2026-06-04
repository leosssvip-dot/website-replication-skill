# Replication PRD Template

Use this after the audit evidence and page region model are complete. A PRD is required for implementation-ready replication work; a gap report alone is not enough.

## 1. Product Objective

- Reference site / workflow:
- Target product / repo:
- User problem:
- Success outcome:
- Differentiation direction:
- Non-goals:

## 2. User Workflow

Describe the end-to-end path in implementation terms.

| Step | User Action | System Response | Region(s) Involved | Source |
| --- | --- | --- | --- | --- |
| 1 |  |  | Z1, Z2 | observed / inferred |

## 3. Page Region Model

Link or inline the final model from `region-model-template.md`.

- Region model artifact:
- Region relationship graph:
- Page-level state machine:

## 4. Region Requirements

Repeat this contract for every major region.

### Z1: <Region Name>

Purpose:

-

Visible When:

- Desktop:
- Mobile:
- Gated / auth:

Owns State:

-

Consumes:

-

Emits:

-

Updates:

-

UI Requirements:

-

Layout Constraints:

- Placement:
- Anchor target:
- Positioning mode:
- Sizing:
- Scroll behavior:
- Layering / containment:
- Responsive transform:
- Collision rules:

Behavior Requirements:

-

Empty / Loading / Error / Success:

- Empty:
- Loading:
- Error:
- Success:

Acceptance Criteria:

- [ ]

## 5. Cross-Region Interaction Contracts

| Contract ID | Trigger Region | Trigger | Target Region | Required State Change | API / Data Dependency | Acceptance |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | Z1 | submit valid form | Z2 | empty -> loading; then result/error | create task + poll status |  |

## 6. Control And Picker Requirements

Convert the audit's Control Intent Ledger into build requirements. Include every primary, secondary, icon-only, picker, saved-item, and result-routing control that affects user workflow or persisted state.

| Requirement ID | Control ID | Region | Required Behavior | Auth / Gate Behavior | Persistence | Cross-Region Updates | Result Routing | Acceptance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-C1 | i000 | Z1 | opens picker; select updates current label | anonymous gates; authenticated opens | workspace-persistent | Z1 label + Z2 list + Z3 breadcrumb | created item lands in selected destination |  |

Picker / saved-item controls must prove open, option list, current selection, select / create / clear when present, close behavior, refresh persistence, and downstream submit or move behavior. A static confirmation is not acceptable unless the reference is also static.

## 7. Data And API Contracts

| Feature | UI Field / Event | Target Payload | Validation | Response Handling | Persistence | Source |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  | observed / documented / inferred |

## 8. State Machines

### Page State

```mermaid
stateDiagram-v2
  [*] --> Empty
  Empty --> Ready
  Ready --> Submitting
  Submitting --> Processing
  Processing --> Completed
  Processing --> Failed
  Completed --> Ready: edit / regenerate
```

### Async Job State

| State | Entered When | UI Region Impact | Exit Condition | Error Handling |
| --- | --- | --- | --- | --- |
| queued |  |  |  |  |
| processing |  |  |  |  |
| completed |  |  |  |  |
| failed |  |  |  |  |

## 9. Responsive And Accessibility Requirements

- Desktop layout:
- Tablet layout:
- Mobile layout:
- Keyboard / focus:
- Screen reader labels:
- Minimum tap targets:
- Overflow rules:
- Fixed / sticky / docked regions:
- Safe-area and keyboard avoidance:

## 10. Implementation Plan

| Phase | Work | Readiness | Dependencies | Acceptance | Verification |
| --- | --- | --- | --- | --- | --- |
| 1 |  | can implement now / needs preparation |  |  |  |

## 11. Verification Plan

- Unit/component tests:
- Payload contract tests:
- API route tests:
- Browser flow tests:
- Control intent / picker tests:
- Persistence and result-routing tests:
- Desktop/mobile screenshot checks:
- Region relationship checks:
- Evidence redaction check:

## 12. Open Questions And Blockers

| Item | Type | Blocking? | Owner / Next Step |
| --- | --- | --- | --- |
|  | unknown / blocked / decision | yes / no |  |

## 13. PRD Completeness Checklist

- [ ] Every `Z*` region has a requirement contract.
- [ ] Every `Z*` region has layout constraints: placement, anchor target, positioning mode, sizing, scroll behavior, layering / containment, responsive transform, and collision rules.
- [ ] Every cross-region dependency has a contract ID.
- [ ] Every meaningful control has a Control / Picker requirement or an explicit `not applicable` reason.
- [ ] Picker / saved-item controls specify authenticated behavior, option list, current state label, create / select / clear behavior where present, close behavior, persistence, and downstream result effect.
- [ ] Input regions specify emitted events and payload shape.
- [ ] Output regions specify consumed state and update triggers.
- [ ] Empty/loading/error/success states are specified where relevant.
- [ ] Mobile behavior is specified for every major region.
- [ ] API/data contracts are tied to region interactions.
- [ ] Acceptance criteria are testable.
- [ ] Blocked work is separated from ready implementation work.
