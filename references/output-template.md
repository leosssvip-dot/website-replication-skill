# Website Replication Deliverable Template

Use this structure for an implementation-ready replication report. Keep claims tied to evidence. "Competitor" below means *the reference site being audited* — it may also be a legacy product, partner integration, or inspiration source.

Adapt section depth to the competitor's domain (SaaS / e-commerce / content / collaboration / AI tool / marketplace / internal tool). Remove sections that do not apply and say so explicitly rather than leaving empty tables.

## 1. Scope

- Competitor:
- Target product / repo:
- Pages and states inspected:
- Date / time inspected:
- Auth state:
- Differentiation direction:
- Access limits:

## 2. Evidence

Only include redacted evidence. Do not expose cookies, authorization headers, session IDs, tokens, customer data, uploaded contents, private messages, account identifiers, or one-time URLs.

| Evidence | Path / URL | Source | Redaction | Notes |
| --- | --- | --- | --- | --- |
| Desktop screenshot |  | observed |  |  |
| Mobile screenshot |  | observed |  |  |
| Focused component screenshot |  | observed |  |  |
| DOM / text dump |  | observed |  |  |
| Network log / API trace |  | observed |  |  |
| Interactive inventory | `evidence/interactive-inventory.md` | observed |  | DOM-enumerated, stable IDs |

### Interaction Coverage

| Metric | Value |
| --- | --- |
| Interactive elements enumerated | N |
| Probed | M |
| Coverage | M / N (X%) |
| Hidden-state passes completed | hover · keyboard · right-click · drag · scroll · input-edge · network · url-history · multi-window |

Coverage below 90% without a `blocked` reason is **not acceptable** — list un-probed elements and the reason here before finalizing.

#### Reflection round

Three things most likely to have been missed (per Workflow step 8), and the result of probing each:

| # | Suspected miss | Probed result |
| --- | --- | --- |
| 1 |  | observed / inferred / blocked / confirmed-absent |
| 2 |  | observed / inferred / blocked / confirmed-absent |
| 3 |  | observed / inferred / blocked / confirmed-absent |

## 3. Executive Gap Summary

| Priority | Area | Gap | Impact | Source | Confidence | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| P0 |  |  |  | observed / documented / inferred | high / medium / low |  |
| P1 |  |  |  | observed / documented / inferred | high / medium / low |  |
| P2 |  |  |  | observed / documented / inferred | high / medium / low |  |

## 4. UI System

### Visual Tokens

| Token | Competitor | Target Recommendation | Source |
| --- | --- | --- | --- |
| Background |  |  | observed |
| Panel |  |  | observed |
| Accent |  |  | observed |
| Text |  |  | observed |
| Radius |  |  | observed |
| Spacing scale |  |  | observed |
| Font family |  |  | observed |

### Component Inventory

| Component | Competitor Behavior | Target Component | Status | Source | Notes |
| --- | --- | --- | --- | --- | --- |
|  |  |  | matched / different by design / missing / blocked / not applicable |  |  |

### Representative Component Example

Demonstrate only the *structural pattern* using the target brand's own tokens and copy. Do not paste competitor class names, exact spacing values, copy, or distinctive composition. Skip this block if no reusable pattern is worth documenting.

```html
<!-- target-brand markup illustrating the pattern, not a copy of competitor markup -->
```

```css
/* tokens / layout primitives only */
```

```js
// event/state pattern only when non-obvious
```

## 5. Page Region Relationship Model

Use [region-model-template.md](region-model-template.md). Do not stop at visual labels like "left panel" or "right panel"; describe each region's product responsibility and relationships.

### Region Map

| Zone ID | Region Name | Evidence / Selector | Visual Position | Purpose | Owns State | Consumes State | Emits Events | Updates | Source | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Z1 |  | screenshot / DOM / inventory IDs |  |  |  |  |  |  | observed / inferred | high / medium / low |

### Region Dependency Matrix

| From Region | Event / Data | To Region | Trigger | Target State Change | API / Storage Dependency | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Z1 | form payload | Z2 | submit | empty -> loading -> result/error |  |  |

### Region Relationship Graph

```mermaid
flowchart LR
  Z1["Z1 Input / Config"] -->|"submit payload"| Z2["Z2 Result / Output"]
  Z3["Z3 History / Selection"] -->|"restore item"| Z1
  Z3 -->|"show saved result"| Z2
```

### Region State Contracts

| Region | Empty | Ready | Loading | Success | Error | Disabled / Gated |
| --- | --- | --- | --- | --- | --- | --- |
| Z1 |  |  |  |  |  |  |
| Z2 |  |  |  |  |  |  |

## 6. Interaction Matrix

Rows below are *examples* of common interactions to consider. Replace with the actual user actions in scope; do not leave generic placeholders in the final deliverable.

| User Action | Source Region | Target Region | Competitor Result | Target Result | Status | Source | Confidence | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Primary CTA | Z1 | Z2 |  |  |  | observed / documented / inferred |  |  |
| Mode / tab switch |  |  |  |  |  | observed / documented / inferred |  |  |
| Secondary action (clear / copy / save / expand) |  |  |  |  |  | observed / documented / inferred |  |  |
| Upload / select source |  |  |  |  |  | observed / documented / inferred |  |  |
| Submit / confirm |  |  |  |  |  | observed / documented / inferred |  |  |
| Post-submit / result action |  |  |  |  |  | observed / documented / inferred |  |  |
| Gated state (auth / quota / paywall) |  |  |  |  |  | observed / documented / inferred |  |  |

### Interaction Flow

Include a sequence diagram only when async work, third-party services, or background storage matters. Otherwise skip.

```mermaid
sequenceDiagram
  participant User
  participant UI
  participant API
  participant ExternalService
  participant Storage
  User->>UI: Fill form and submit
  UI->>API: POST payload
  API->>ExternalService: Forward / create job
  ExternalService-->>API: Result or task id
  API->>Storage: Persist record
  UI->>API: Poll or subscribe
  API-->>UI: Final state
```

## 7. API And Backend Mapping

| Feature | Region / Contract | Competitor Field / Call | Target UI Field | Target API Payload | Integration Need | Status | Source | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  | Z1 / C1 |  |  |  |  |  | observed / documented / inferred | high / medium / low |

### Observed / Documented Endpoints

| Method | Route | Request Shape | Response Shape | Auth Class | Source | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| POST |  | redacted | redacted |  | observed / documented |  |
| GET |  | redacted | redacted |  | observed / documented |  |

### Blocked Or Unknown API Work

| Gap | Why Blocked | Evidence | Preparation Needed |
| --- | --- | --- | --- |
|  | missing docs / auth / paid access / private target API |  |  |

## 8. Data Model

Replace the example entities below with the actual domain. Common shapes by product type:

- **SaaS / collaboration**: users, organizations, workspaces, members, primary domain object, activity log.
- **E-commerce**: users, products, variants, carts, orders, payments, shipments.
- **Content / publishing**: users, posts, media, collections, comments, subscriptions.
- **AI / generative tool**: users, projects, jobs, assets, prompts, credits.
- **Marketplace**: buyers, sellers, listings, transactions, reviews.
- **Internal tool**: users, roles, records, events, audit log.

```mermaid
erDiagram
  user ||--o{ primary_entity : owns
  primary_entity ||--o{ child_entity : has
  user ||--o{ audit_log : generates
```

### Core Tables

| Table | Purpose | Key Fields | Region / State Link |
| --- | --- | --- | --- |
|  |  |  |  |

## 9. Architecture Recommendation

Only fill rows that the audit's evidence supports. Mark out-of-scope rows `not applicable`.

| Layer | Recommendation | Reason | Source | Confidence |
| --- | --- | --- | --- | --- |
| Frontend framework |  |  | observed / documented / inferred |  |
| State management |  |  | observed / documented / inferred |  |
| UI system |  |  | observed / documented / inferred |  |
| Backend / API |  |  | observed / documented / inferred |  |
| Database |  |  | observed / documented / inferred |  |
| File / object storage |  |  | observed / documented / inferred |  |
| Background jobs / queue |  |  | observed / documented / inferred |  |
| External integrations |  |  | observed / documented / inferred |  |
| Auth / permissions |  |  | observed / documented / inferred |  |
| Billing / quota |  |  | observed / documented / inferred |  |
| Observability |  |  | observed / documented / inferred |  |

```mermaid
flowchart LR
  Web["Frontend"] --> API["API / Backend"]
  API --> DB["Database"]
  API --> Store["Object Storage"]
  API --> Queue["Background Jobs"]
  Queue --> Worker["Worker"]
  Worker --> Ext["External Integration"]
  Ext --> Callback["Webhook / Callback"]
  Callback --> DB
```

## 10. Replication PRD Handoff

Use [prd-template.md](prd-template.md) for the full PRD. The PRD is required for implementation-ready work.

### Product Objective

- User problem:
- Success outcome:
- Non-goals:

### Region Requirement Index

| Region | Requirement Section | Required Contracts | Acceptance Summary |
| --- | --- | --- | --- |
| Z1 | PRD section link | C1, C2 |  |
| Z2 | PRD section link | C1, C3 |  |

### Cross-Region Contract Index

| Contract ID | Trigger Region | Trigger | Target Region | Required State Change | API / Data Dependency | Acceptance |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | Z1 | submit valid form | Z2 | empty -> loading -> result/error |  |  |

## 11. Implementation Plan

| Step | Work | Readiness | Acceptance | Verification |
| --- | --- | --- | --- | --- |
| 1 |  | can implement now / needs preparation |  |  |
| 2 |  | can implement now / needs preparation |  |  |
| 3 |  | can implement now / needs preparation |  |  |

## 12. Verification Checklist

- [ ] Screenshot evidence captured for competitor and target.
- [ ] Evidence is redacted; no secrets, private data, or one-time URLs.
- [ ] Interactive inventory generated via DOM enumeration; coverage M / N ≥ 90% or gaps justified.
- [ ] All hidden-state passes completed or marked `not applicable` with reason.
- [ ] Reflection round (3 likely-missed candidates) probed and recorded.
- [ ] Page region relationship model completed with `Z*` IDs.
- [ ] Every major region has purpose, owned state, consumed state, emitted events, updates, and responsive behavior.
- [ ] Cross-region contracts exist for the primary user workflow.
- [ ] Component inventory complete.
- [ ] Interaction matrix covers small controls and post-submit actions.
- [ ] API mapping separates observed / documented / inferred / blocked / missing.
- [ ] Data and architecture diagrams included when backend work matters; otherwise marked not applicable.
- [ ] Blocked backend / API work is separated from ready implementation work.
- [ ] Replication PRD exists for implementation-ready work and contains testable acceptance criteria.
- [ ] Tests cover new UI behavior and payload mapping (when working in a repo).
- [ ] Build / typecheck / lint passed.
- [ ] Desktop and mobile visual checks passed.
- [ ] Missing backend work is documented, not silently removed from scope.
