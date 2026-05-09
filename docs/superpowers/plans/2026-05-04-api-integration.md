# API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two broken mutations and add full-form modals for event ingestion and agent promotion so every backend API endpoint has working frontend coverage.

**Architecture:** Co-located modal components (defined at the bottom of the page file that uses them) following the existing helper-function pattern. Broken mutations are fixed by correcting field names to match the exact backend Zod schemas. The `eventId` field is threaded from the DB through the UI adapter response into the frontend Row type so the reconcile call has the right identifier.

**Tech Stack:** React 18, TypeScript, TanStack React Query v5, React Hook Form, Zod, Radix UI Dialog, Tailwind CSS, Express + Zod (backend adapter change).

---

## File Map

| File | What changes |
|---|---|
| `frontend/src/types/api.ts` | Add `eventId: string` to `Row` type |
| `src/modules/ui/ui.routes.ts` | Expose `eventId: r.eventId` in `GET /pel/rows` response |
| `frontend/src/pages/ecl/PredictiveLedger.tsx` | Fix reconcile mutation field names; pass `eventId` instead of `decisionId` |
| `frontend/src/pages/ecl/Recommendations.tsx` | Fix decide mutation: `status`→`outcome`, remove `decidedBy`, add `rationale` |
| `frontend/src/pages/ecl/ObservationPlane.tsx` | Add `IngestEventModal` component + "Ingest Event" trigger button |
| `frontend/src/pages/agents/AgentRoster.tsx` | Add `PromoteAgentModal` component + "Promote" button per agent row |

---

## Task 1 — Thread `eventId` through Row type and UI adapter

**Files:**
- Modify: `frontend/src/types/api.ts`
- Modify: `src/modules/ui/ui.routes.ts`

### Why this must go first
`PredictiveLedger.tsx` (Task 2) needs `active.eventId`. It gets that from the `Row` type, which gets it from the UI adapter response. Do this before touching the page.

- [ ] **Step 1: Add `eventId` to the Row type**

Open `frontend/src/types/api.ts`. The `Row` type currently ends with `prevRowHash?: string`. Add `eventId` as the second field (right after `decisionId`):

```typescript
export type Row = {
  decisionId: string;
  eventId: string;          // ← add this line
  agentId: string;
  status: string;
  // ... rest unchanged
};
```

Full updated `Row` type (replace the entire existing `Row` type block at line ~120):

```typescript
export type Row = {
  decisionId: string;
  eventId: string;
  agentId: string;
  status: string;
  createdAt: string;
  closedAt?: string;
  predictedCostUsd: number;
  predictedOutcomeUsd: number;
  actualCostUsd?: number;
  actualOutcomeUsd?: number;
  techVarianceSigma?: number;
  techErrorRate?: number;
  econWinRateDelta?: number;
  econCostDelta?: number;
  attributionBucket?: string;
  attributionConfidence?: number;
  correctionType?: string;
  correctionRef?: string;
  cosignStatus?: string;
  uefGstiClassification?: string;
  rowHash: string;
  prevRowHash?: string;
};
```

- [ ] **Step 2: Expose `eventId` in the UI adapter `GET /pel/rows` response**

Open `src/modules/ui/ui.routes.ts`. Find the `router.get("/pel/rows", ...)` handler (around line 334). Inside the `out` mapping, add `eventId: r.eventId` as the second property of each row object:

```typescript
const out = ledger.map((r) => {
  const ev = eventCache.get(r.eventId);
  const idx = sorted.findIndex((x) => x.id === r.id);
  return {
    decisionId: ev?.decisionId ?? r.eventId,
    eventId: r.eventId,                          // ← add this line
    agentId: ev?.agentId ?? "—",
    status:
      r.actualCostUsd == null ? "open" : r.cosignStatus ?? "closed",
    // ... rest of the object unchanged
  };
});
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see errors referencing `eventId`, check the `Row` type was saved correctly.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/api.ts src/modules/ui/ui.routes.ts
git commit -m "feat: thread eventId through Row type and UI adapter pel/rows response"
```

---

## Task 2 — Fix PredictiveLedger reconcile mutation

**Files:**
- Modify: `frontend/src/pages/ecl/PredictiveLedger.tsx`

**Problem:** The reconcile `useMutation` sends `{ decisionId, sor }` but `reconcileSchema` requires `{ eventId, actualSourceSor }`. The button also passes `active.decisionId` but must pass `active.eventId`.

- [ ] **Step 1: Fix the reconcile mutation definition**

Open `frontend/src/pages/ecl/PredictiveLedger.tsx`. Find the `reconcile` mutation (around line 20). Replace the entire `useMutation` block:

**Before:**
```typescript
const reconcile = useMutation({
  mutationFn: (decisionId: string) =>
    apiRequest("POST", "/api/pel/reconcile", {
      decisionId,
      actualCostUsd: 0.012 + Math.random() * 0.04,
      actualOutcomeUsd: 0.6 + Math.random() * 0.6,
      sor: ["salesforce", "sap", "hubspot", "oracle_gl"][Math.floor(Math.random() * 4)],
    }),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["/api/pel/rows"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
  },
});
```

**After:**
```typescript
const reconcile = useMutation({
  mutationFn: (eventId: string) =>
    apiRequest("POST", "/api/pel/reconcile", {
      eventId,
      actualCostUsd: 0.012 + Math.random() * 0.04,
      actualOutcomeUsd: 0.6 + Math.random() * 0.6,
      actualSourceSor: ["salesforce", "sap", "hubspot", "oracle_gl"][Math.floor(Math.random() * 4)],
    }),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["/api/pel/rows"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
  },
});
```

- [ ] **Step 2: Fix the call site — pass `eventId` not `decisionId`**

In the same file, find the "Simulate SoR reconciliation" button (around line 141). Change the `onClick`:

**Before:**
```typescript
<Button size="sm" variant="outline" onClick={() => reconcile.mutate(active.decisionId)} ...>
```

**After:**
```typescript
<Button size="sm" variant="outline" onClick={() => reconcile.mutate(active.eventId)} ...>
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

1. Open http://localhost:5173/ledger
2. Click any row that shows status "open" in the detail panel
3. Click "Simulate SoR reconciliation"
4. Expect: button spins briefly, row status changes to "closed" or "partial", no red error banner

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ecl/PredictiveLedger.tsx
git commit -m "fix: reconcile mutation sends eventId and actualSourceSor matching backend schema"
```

---

## Task 3 — Fix Recommendations decide mutation

**Files:**
- Modify: `frontend/src/pages/ecl/Recommendations.tsx`

**Problem:** The decide mutation sends `{ status, decidedBy }` but `decideBodySchema` requires `{ outcome, rationale }` where `rationale` is a required non-empty string.

- [ ] **Step 1: Fix the decide mutation definition**

Open `frontend/src/pages/ecl/Recommendations.tsx`. Find the `decide` mutation (around line 27). Replace the entire `useMutation` block:

**Before:**
```typescript
const decide = useMutation({
  mutationFn: ({ id, status }: { id: string; status: string }) =>
    apiRequest("POST", `/api/recommendations/${id}/decide`, { status, decidedBy: "les@fuzebox.ai" }),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/recommendations"] }),
});
```

**After:**
```typescript
const decide = useMutation({
  mutationFn: ({ id, outcome }: { id: string; outcome: string }) =>
    apiRequest("POST", `/api/recommendations/${id}/decide`, {
      outcome,
      rationale: `User decision: ${outcome}`,
    }),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/recommendations"] }),
});
```

- [ ] **Step 2: Fix the two call sites — rename `status` to `outcome`**

In the same file, find the two buttons that call `decide.mutate` (around lines 106–110). Update both:

**Before:**
```typescript
<Button size="sm" variant="outline" onClick={() => decide.mutate({ id: r.recId, status: "rejected" })} ...>
  <X className="h-3.5 w-3.5 mr-1" /> Reject
</Button>
<Button size="sm" onClick={() => decide.mutate({ id: r.recId, status: "adopted" })} ...>
  <Check className="h-3.5 w-3.5 mr-1" /> Adopt
</Button>
```

**After:**
```typescript
<Button size="sm" variant="outline" onClick={() => decide.mutate({ id: r.recId, outcome: "rejected" })} ...>
  <X className="h-3.5 w-3.5 mr-1" /> Reject
</Button>
<Button size="sm" onClick={() => decide.mutate({ id: r.recId, outcome: "adopted" })} ...>
  <Check className="h-3.5 w-3.5 mr-1" /> Adopt
</Button>
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

1. Open http://localhost:5173/recommendations
2. Find a recommendation with status "new"
3. Click "Adopt" or "Reject"
4. Expect: recommendation disappears from the "new" filter, no red error banner

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ecl/Recommendations.tsx
git commit -m "fix: decide mutation sends outcome+rationale matching backend decideBodySchema"
```

---

## Task 4 — Add IngestEventModal to ObservationPlane

**Files:**
- Modify: `frontend/src/pages/ecl/ObservationPlane.tsx`

**Endpoint:** `POST /api/observation/ingest`

**Exact backend schema** (from `src/modules/observation/observation.types.ts`):
- `hyperscaler`: enum `anthropic | openai | copilot | uniphore | mistral`
- `agentId`: string (required)
- `agentName`: string (optional)
- `model`: string (required)
- `inputTokens`: int ≥ 0 (default 0)
- `outputTokens`: int ≥ 0 (default 0)
- `wallMs`: int ≥ 0 (default 0)
- `vendorCostUsd`: number ≥ 0 (default 0)
- `humanBaselineMinutes`: number ≥ 0 (default 0)
- `manualHourlyCostUsd`: number ≥ 0 (default 0)
- `passedThresholds`: boolean (default true)
- `capturedVia`: enum `litellm | otel | webhook | ebpf` (default litellm)

- [ ] **Step 1: Add imports to ObservationPlane.tsx**

Open `frontend/src/pages/ecl/ObservationPlane.tsx`. Add these imports at the top alongside the existing ones:

```typescript
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Plus } from "lucide-react";
```

- [ ] **Step 2: Add the Zod schema and type for the ingest form**

Add this block immediately before the `export default function ObservationPlane()` line:

```typescript
const ingestFormSchema = z.object({
  hyperscaler: z.enum(["anthropic", "openai", "copilot", "uniphore", "mistral"]),
  agentId: z.string().min(1, "Agent ID is required"),
  agentName: z.string().optional(),
  model: z.string().min(1, "Model is required"),
  inputTokens: z.coerce.number().int().nonnegative().default(0),
  outputTokens: z.coerce.number().int().nonnegative().default(0),
  wallMs: z.coerce.number().int().nonnegative().default(0),
  vendorCostUsd: z.coerce.number().nonnegative().default(0),
  humanBaselineMinutes: z.coerce.number().nonnegative().default(0),
  manualHourlyCostUsd: z.coerce.number().nonnegative().default(75),
  passedThresholds: z.boolean().default(true),
  capturedVia: z.enum(["litellm", "otel", "webhook", "ebpf"]).default("litellm"),
});
type IngestFormValues = z.infer<typeof ingestFormSchema>;
```

- [ ] **Step 3: Wire the modal state and mutation into ObservationPlane**

Inside `export default function ObservationPlane()`, add these lines right after the existing `useQuery` calls:

```typescript
const qc = useQueryClient();
const [ingestOpen, setIngestOpen] = useState(false);
const ingest = useMutation({
  mutationFn: (data: IngestFormValues) =>
    apiRequest("POST", "/api/observation/ingest", data),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["/api/observation/events"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    setIngestOpen(false);
  },
});
```

- [ ] **Step 4: Add the "Ingest Event" trigger button to the Layout**

In the `ObservationPlane` return JSX, find the `<Layout ...>` opening tag and add a `headerRight` prop:

**Before:**
```tsx
<Layout title="Observation Plane" kicker="Economic Cognition / Observation Plane">
```

**After:**
```tsx
<Layout title="Observation Plane" kicker="Economic Cognition / Observation Plane"
  headerRight={
    <Button size="sm" onClick={() => setIngestOpen(true)} data-testid="btn-ingest">
      <Plus className="h-3.5 w-3.5 mr-1.5" /> Ingest Event
    </Button>
  }
>
```

Then add the modal just before the closing `</Layout>`:

```tsx
  <IngestEventModal
    open={ingestOpen}
    onOpenChange={setIngestOpen}
    mutation={ingest}
  />
</Layout>
```

- [ ] **Step 5: Add the IngestEventModal component**

Add this entire component at the bottom of `ObservationPlane.tsx`, after the existing `Th` and `Td` helper functions:

```typescript
function IngestEventModal({
  open,
  onOpenChange,
  mutation,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mutation: ReturnType<typeof useMutation<Response, Error, IngestFormValues>>;
}) {
  const form = useForm<IngestFormValues>({
    resolver: zodResolver(ingestFormSchema),
    defaultValues: {
      hyperscaler: "anthropic",
      agentId: "",
      agentName: "",
      model: "",
      inputTokens: 0,
      outputTokens: 0,
      wallMs: 0,
      vendorCostUsd: 0,
      humanBaselineMinutes: 0,
      manualHourlyCostUsd: 75,
      passedThresholds: true,
      capturedVia: "litellm",
    },
  });

  function onSubmit(values: IngestFormValues) {
    mutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ingest Canonical Event</DialogTitle>
        </DialogHeader>

        {mutation.error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {mutation.error.message}
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="hyperscaler">Hyperscaler</Label>
              <select
                id="hyperscaler"
                {...form.register("hyperscaler")}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="anthropic">anthropic</option>
                <option value="openai">openai</option>
                <option value="copilot">copilot</option>
                <option value="uniphore">uniphore</option>
                <option value="mistral">mistral</option>
              </select>
            </div>
            <div>
              <Label htmlFor="capturedVia">Captured via</Label>
              <select
                id="capturedVia"
                {...form.register("capturedVia")}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="litellm">litellm</option>
                <option value="otel">otel</option>
                <option value="webhook">webhook</option>
                <option value="ebpf">ebpf</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="agentId">Agent ID <span className="text-red-500">*</span></Label>
              <Input id="agentId" {...form.register("agentId")} placeholder="agent_abc123" className="mt-1" />
              {form.formState.errors.agentId && (
                <p className="text-xs text-red-600 mt-1">{form.formState.errors.agentId.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="agentName">Agent Name</Label>
              <Input id="agentName" {...form.register("agentName")} placeholder="optional" className="mt-1" />
            </div>
          </div>

          <div>
            <Label htmlFor="model">Model <span className="text-red-500">*</span></Label>
            <Input id="model" {...form.register("model")} placeholder="claude-3-5-sonnet-20241022" className="mt-1" />
            {form.formState.errors.model && (
              <p className="text-xs text-red-600 mt-1">{form.formState.errors.model.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="inputTokens">Input tokens</Label>
              <Input id="inputTokens" type="number" min={0} {...form.register("inputTokens")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="outputTokens">Output tokens</Label>
              <Input id="outputTokens" type="number" min={0} {...form.register("outputTokens")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="wallMs">Wall time (ms)</Label>
              <Input id="wallMs" type="number" min={0} {...form.register("wallMs")} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="vendorCostUsd">Vendor cost ($)</Label>
              <Input id="vendorCostUsd" type="number" min={0} step="0.0001" {...form.register("vendorCostUsd")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="humanBaselineMinutes">Human baseline (min)</Label>
              <Input id="humanBaselineMinutes" type="number" min={0} {...form.register("humanBaselineMinutes")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="manualHourlyCostUsd">Hourly cost ($)</Label>
              <Input id="manualHourlyCostUsd" type="number" min={0} {...form.register("manualHourlyCostUsd")} className="mt-1" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="passedThresholds"
              type="checkbox"
              {...form.register("passedThresholds")}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="passedThresholds">Passed thresholds</Label>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Ingesting…" : "Ingest Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: Check Layout accepts `headerRight` prop**

Verify `frontend/src/components/layout/Layout.tsx` accepts a `headerRight` prop. If it does not, add it:

```bash
grep -n "headerRight" frontend/src/components/layout/Layout.tsx
```

If no output: open `Layout.tsx`, find the props interface and the header JSX, and add:

```typescript
// In props interface:
headerRight?: React.ReactNode;

// In JSX header area, alongside the title:
{headerRight && <div className="ml-auto">{headerRight}</div>}
```

- [ ] **Step 7: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors. Common fix: if `useMutation` return type annotation causes issues, simplify the modal's `mutation` prop type to `any` temporarily and fix after confirming the UI works.

- [ ] **Step 8: Manual smoke test**

```bash
npm run dev
```

1. Open http://localhost:5173/observation
2. Click "Ingest Event" button (top-right of page)
3. Fill in: hyperscaler=anthropic, agentId=test_agent_1, model=claude-3-5-sonnet-20241022, inputTokens=100, outputTokens=50
4. Click "Ingest Event" in modal
5. Expect: modal closes, event count KPI increments, new row appears in the event table

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/ecl/ObservationPlane.tsx
git commit -m "feat: add IngestEventModal to ObservationPlane with full form wired to POST /api/observation/ingest"
```

---

## Task 5 — Add PromoteAgentModal to AgentRoster

**Files:**
- Modify: `frontend/src/pages/agents/AgentRoster.tsx`

**Endpoint:** `POST /api/governance/promote`

**Exact backend schema** (from `src/modules/governance/governance.types.ts`):
- `agentId`: string (required)
- `targetTier`: enum `T0_unverified | T1_observed | T2_supervised | T3_delegated | T4_autonomous`
- `reason`: string min 1 (required)

**Tier progression** (one step only, read-only computed):
```
T0_unverified → T1_observed → T2_supervised → T3_delegated → T4_autonomous
```

- [ ] **Step 1: Add imports to AgentRoster.tsx**

Open `frontend/src/pages/agents/AgentRoster.tsx`. Add these imports at the top:

```typescript
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { ArrowUpCircle } from "lucide-react";
```

- [ ] **Step 2: Add tier progression helper and form schema**

Add this block immediately before `export default function AgentRoster()`:

```typescript
const TIER_ORDER = [
  "T0_unverified",
  "T1_observed",
  "T2_supervised",
  "T3_delegated",
  "T4_autonomous",
] as const;
type TrustTier = (typeof TIER_ORDER)[number];

function nextTier(current: string): TrustTier | null {
  const idx = TIER_ORDER.indexOf(current as TrustTier);
  if (idx === -1 || idx === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

const promoteFormSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});
type PromoteFormValues = z.infer<typeof promoteFormSchema>;
```

- [ ] **Step 3: Wire the modal state and mutation into AgentRoster**

Inside `export default function AgentRoster()`, add these lines right after the existing `useQuery` call:

```typescript
const qc = useQueryClient();
const [promoteTarget, setPromoteTarget] = useState<{ agentId: string; currentTier: string; targetTier: string } | null>(null);
const promote = useMutation({
  mutationFn: (data: { agentId: string; targetTier: string; reason: string }) =>
    apiRequest("POST", "/api/governance/promote", data),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["/api/agents"] });
    qc.invalidateQueries({ queryKey: ["/api/governance/decisions"] });
    setPromoteTarget(null);
  },
});
```

- [ ] **Step 4: Add "Promote" button to each agent row**

In the agent table body, find the `<tr>` for each agent. Currently the last `<Td>` contains the status Pill. Add a new `<Td>` column after it:

First add the column header in `<thead>`:

**Before:**
```tsx
<tr><Th>Agent</Th><Th>Vendor / Model</Th><Th>Trust tier</Th><Th>Sigma</Th><Th>Status</Th></tr>
```

**After:**
```tsx
<tr><Th>Agent</Th><Th>Vendor / Model</Th><Th>Trust tier</Th><Th>Sigma</Th><Th>Status</Th><Th></Th></tr>
```

Then in the row body, add one more `<Td>` as the last cell inside the `list.map(a => ...)`:

```tsx
<Td>
  {nextTier(a.trustTier) && (
    <Button
      size="sm"
      variant="outline"
      onClick={() => setPromoteTarget({
        agentId: a.agentId,
        currentTier: a.trustTier,
        targetTier: nextTier(a.trustTier)!,
      })}
      data-testid={`btn-promote-${a.agentId}`}
    >
      <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
      Promote
    </Button>
  )}
</Td>
```

- [ ] **Step 5: Add the modal JSX and closing modal component**

In the `AgentRoster` return JSX, add the modal just before the closing `</Layout>`:

```tsx
  <PromoteAgentModal
    target={promoteTarget}
    onClose={() => setPromoteTarget(null)}
    mutation={promote}
  />
</Layout>
```

- [ ] **Step 6: Add the PromoteAgentModal component**

Add this entire component at the bottom of `AgentRoster.tsx`, after the existing `Th` and `Td` helper functions:

```typescript
const TIER_LABELS: Record<string, string> = {
  T0_unverified: "T0 · Unverified",
  T1_observed:   "T1 · Observed",
  T2_supervised: "T2 · Supervised",
  T3_delegated:  "T3 · Delegated",
  T4_autonomous: "T4 · Autonomous",
};

function PromoteAgentModal({
  target,
  onClose,
  mutation,
}: {
  target: { agentId: string; currentTier: string; targetTier: string } | null;
  onClose: () => void;
  mutation: ReturnType<typeof useMutation<Response, Error, { agentId: string; targetTier: string; reason: string }>>;
}) {
  const form = useForm<PromoteFormValues>({
    resolver: zodResolver(promoteFormSchema),
    defaultValues: { reason: "" },
  });

  function onSubmit(values: PromoteFormValues) {
    if (!target) return;
    mutation.mutate({
      agentId: target.agentId,
      targetTier: target.targetTier,
      reason: values.reason,
    });
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => { if (!open) { onClose(); form.reset(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Promote Agent</DialogTitle>
        </DialogHeader>

        {mutation.error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {mutation.error.message}
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-[.16em] text-muted-foreground font-semibold mb-1">Agent</div>
              <div className="font-mono text-xs">{target?.agentId}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[.16em] text-muted-foreground font-semibold mb-1">Transition</div>
              <div className="text-xs">
                <span className="font-mono">{TIER_LABELS[target?.currentTier ?? ""] ?? target?.currentTier}</span>
                {" → "}
                <span className="font-mono font-semibold text-primary">{TIER_LABELS[target?.targetTier ?? ""] ?? target?.targetTier}</span>
              </div>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <Label htmlFor="reason">Reason <span className="text-red-500">*</span></Label>
              <Textarea
                id="reason"
                {...form.register("reason")}
                placeholder="Describe why this agent meets the criteria for promotion…"
                rows={3}
                className="mt-1 resize-none"
              />
              {form.formState.errors.reason && (
                <p className="text-xs text-red-600 mt-1">{form.formState.errors.reason.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { onClose(); form.reset(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Promoting…" : "Confirm Promotion"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 7: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Manual smoke test**

```bash
npm run dev
```

1. Open http://localhost:5173/agents
2. Find any agent row that is not T4_autonomous — it should show a "Promote" button
3. Click "Promote" on any agent
4. Expect: modal opens showing agent ID and tier transition
5. Enter a reason (at least 10 chars), e.g. "Performance criteria met"
6. Click "Confirm Promotion"
7. Expect: modal closes, agent row updates to the next tier in the table
8. Navigate to http://localhost:5173/audit — expect a new governance decision row for the promotion

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/agents/AgentRoster.tsx
git commit -m "feat: add PromoteAgentModal to AgentRoster with full form wired to POST /api/governance/promote"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Fix A (reconcile field names) — Task 1 + Task 2
- ✅ Fix B (decide field names + rationale) — Task 3
- ✅ Ingest Event modal with all form fields — Task 4
- ✅ Promote Agent modal with read-only tier display + reason field — Task 5
- ✅ TRUST_TIERS risk resolved — T3_delegated used throughout (not T3_trusted)
- ✅ Correct HYPERSCALERS used — `copilot`, `uniphore` (not `ms_copilot`, `uniphore_baic`)
- ✅ On-success invalidations correct for all mutations
- ✅ Error display in all modals

**Placeholder scan:** No TBDs. All code blocks are complete.

**Type consistency:**
- `IngestFormValues` defined in Task 4 Step 2, used in Steps 3 and 5 ✅
- `PromoteFormValues` defined in Task 5 Step 2, used in Steps 3 and 6 ✅
- `nextTier()` defined in Task 5 Step 2, used in Steps 4 and 6 ✅
- `TIER_LABELS` defined in Task 5 Step 6 (local to modal), used only inside it ✅
- `Row.eventId` added in Task 1, consumed in Task 2 (`active.eventId`) ✅
