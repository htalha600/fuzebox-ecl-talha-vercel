# API Integration Design — FuzeBox Frontend
**Date:** 2026-05-04  
**Status:** Approved

## Overview

Wire up all remaining frontend→backend API connections in the FuzeBox ECL frontend. Two categories of work:

1. **Fix broken mutations** — two existing `useMutation` calls send wrong field names and will 400 at runtime.
2. **Add missing mutation forms** — two backend endpoints (ingest event, promote agent) have no frontend UI at all.

All GET queries via the UI adapter are already correctly wired. No GET changes needed.

---

## Part 1 — Broken Mutation Fixes

### Fix A: PredictiveLedger reconcile

**File:** `frontend/src/pages/ecl/PredictiveLedger.tsx`  
**Endpoint:** `POST /api/pel/reconcile`

**Problem:** Frontend sends `{ decisionId, sor }` but backend `reconcileSchema` requires `{ eventId, actualSourceSor }`. The `eventId` field does not exist on the `Row` type — it needs to be threaded through.

**Changes required:**

1. `frontend/src/types/api.ts` — add `eventId: string` to the `Row` type.
2. `src/modules/ui/ui.routes.ts` — in the `GET /pel/rows` handler, add `eventId: r.eventId` to each row in the response object.
3. `frontend/src/pages/ecl/PredictiveLedger.tsx` — update reconcile `mutationFn`:
   - Change arg type from `string` (decisionId) to `string` (eventId)
   - Change body field `decisionId` → `eventId`
   - Change body field `sor` → `actualSourceSor`
   - Pass `active.eventId` (not `active.decisionId`) when calling `reconcile.mutate()`

### Fix B: Recommendations decide

**File:** `frontend/src/pages/ecl/Recommendations.tsx`  
**Endpoint:** `POST /api/recommendations/:id/decide`

**Problem:** Frontend sends `{ status, decidedBy }` but backend `decideBodySchema` requires `{ outcome, rationale }` where `rationale` is a required string.

**Changes required:**

1. `frontend/src/pages/ecl/Recommendations.tsx` — update decide `mutationFn`:
   - Rename arg field `status` → `outcome`
   - Remove `decidedBy`
   - Add `rationale: \`User decision: \${outcome}\``

---

## Part 2 — New Mutation Forms (Modals)

Both modals follow the same pattern:
- Radix `<Dialog>` (already in `frontend/src/components/ui/dialog.tsx`)
- React Hook Form + Zod validation (already a project dependency)
- `useMutation` calling `apiRequest`
- Error shown as a red alert `<div>` using `mutation.error?.message`
- Modal closes automatically in `onSuccess`
- Trigger button placed in the page's `headerRight` (ingest) or per-row (promote)

### Modal A: Ingest Event

**Trigger location:** `ObservationPlane.tsx` — "Ingest Event" button in `headerRight`  
**Endpoint:** `POST /api/observation/ingest`  
**On success:** invalidate `["/api/observation/events"]`, `["/api/dashboard/summary"]`

**Form fields:**

| Field | UI Control | Zod rule | Default |
|---|---|---|---|
| hyperscaler | `<select>` | enum: anthropic, openai, ms_copilot, uniphore_baic, mistral | anthropic |
| agentId | text input | min 1 | — |
| agentName | text input | optional | — |
| model | text input | min 1 | — |
| inputTokens | number input | int ≥ 0 | 0 |
| outputTokens | number input | int ≥ 0 | 0 |
| wallMs | number input | int ≥ 0 | 0 |
| vendorCostUsd | number input | ≥ 0 | 0 |
| humanBaselineMinutes | number input | ≥ 0 | 0 |
| manualHourlyCostUsd | number input | ≥ 0 | 75 |
| passedThresholds | checkbox | boolean | true |
| capturedVia | `<select>` | enum: litellm, otel, webhook, ebpf | litellm |

**Component placement:** Defined at the bottom of `ObservationPlane.tsx` as `function IngestEventModal(...)` — same co-location pattern used by all other pages.

### Modal B: Promote Agent

**Trigger location:** `AgentRoster.tsx` — "Promote" button added to each agent row in the table. Button is hidden when agent is already T4_autonomous.  
**Endpoint:** `POST /api/governance/promote`  
**On success:** invalidate `["/api/agents"]`, `["/api/governance/decisions"]`

**Form fields:**

| Field | UI Control | Zod rule | Notes |
|---|---|---|---|
| agentId | read-only display | — | Pre-filled from clicked row |
| currentTier | read-only display | — | Pre-filled from clicked row |
| targetTier | read-only display (computed) | — | Computed as next tier up; displayed as a badge, sent in body |
| reason | `<textarea>` | min 10 chars | Required |

**Tier progression map** (one step only) — verify `TRUST_TIERS` constant in `src/config/constants.ts` during implementation:  
T0_unverified → T1_observed → T2_supervised → T3_??? → T4_autonomous

> ⚠️ Risk: `AgentRoster.tsx` uses `T3_trusted` in its display map but the Swagger doc shows `T3_delegated`. During implementation, read `src/config/constants.ts` and use the actual enum values from there for the tier progression map and the promote request body.

**Component placement:** Defined at the bottom of `AgentRoster.tsx` as `function PromoteAgentModal(...)`.

---

## Data Flow Summary

```
User clicks "Ingest Event"
  → IngestEventModal opens
  → User fills form → submits
  → useMutation → apiRequest("POST", "/api/observation/ingest", formData)
  → 201 response → invalidate events + summary → modal closes

User clicks "Promote" on agent row
  → PromoteAgentModal opens (pre-filled with agent data)
  → User confirms target tier + enters reason → submits
  → useMutation → apiRequest("POST", "/api/governance/promote", { agentId, targetTier, reason })
  → 200 response → invalidate agents + decisions → modal closes

User clicks "Simulate SoR reconciliation" on open ledger row
  → reconcile.mutate(active.eventId)   ← fixed: was active.decisionId
  → apiRequest("POST", "/api/pel/reconcile", { eventId, actualCostUsd, actualOutcomeUsd, actualSourceSor })
  → 200 response → invalidate rows + summary

User clicks "Adopt"/"Reject" on recommendation
  → decide.mutate({ id: rec.recId, outcome: "adopted"|"rejected" })  ← fixed: was status
  → apiRequest("POST", "/api/recommendations/:id/decide", { outcome, rationale })
  → 201 response → invalidate recommendations
```

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/types/api.ts` | Add `eventId: string` to `Row` type |
| `src/modules/ui/ui.routes.ts` | Add `eventId: r.eventId` to pel/rows response |
| `frontend/src/pages/ecl/PredictiveLedger.tsx` | Fix reconcile body fields |
| `frontend/src/pages/ecl/Recommendations.tsx` | Fix decide body fields |
| `frontend/src/pages/ecl/ObservationPlane.tsx` | Add IngestEventModal + trigger button |
| `frontend/src/pages/agents/AgentRoster.tsx` | Add PromoteAgentModal + promote button per row |

---

## What Is Not Changing

- All GET queries — already correct, no changes
- "Export PDF" buttons — no backend endpoint exists, left as-is
- "Emergency Pause All Agents" button — no backend endpoint, left as-is
- Hardcoded sigma values — no sigma API endpoint exists, left as-is
- `POST /api/pel/rollup` — already correct, no changes
- `POST /api/recommendations/generate` — already correct, no changes
