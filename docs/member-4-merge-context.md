# Member 4 Merge Context

## Purpose

This file gives Codex enough context to merge Member 4 backend work with Members 1, 2, and 3 without breaking the demo flow.

## Member 4 Ownership

Member 4 owns:

- Backend API routes under `apps/web/app/api/`
- Demo state and orchestration in `packages/core/`
- Simulated action tools in `packages/tools/`
- Integration wiring between mock data, workers, agents, risk policy, tools, approvals, verification, and feedback
- Demo reset reliability

## Main Backend Demo Flow

The required end-to-end flow is:

1. `GET /api/demo/reset` clears demo state.
2. `POST /api/agent/run` runs the scan.
3. Workers observe marketplace signals.
4. Agents turn events into diagnosed issues.
5. Risk policy is enforced locally.
6. Safe actions auto-execute and produce tool logs.
7. Medium/high-risk actions go to approval queue.
8. Approved actions execute simulated tools.
9. Issues can be verified.
10. Merchant feedback can be saved.

## Required API Routes

Keep these routes stable for Member 1:

- `GET /api/demo/reset`
- `POST /api/agent/run`
- `GET /api/issues`
- `GET /api/issues/:id`
- `GET /api/approvals`
- `POST /api/actions/:id/approve`
- `POST /api/actions/:id/reject`
- `POST /api/actions/:id/execute`
- `POST /api/issues/:id/verify`
- `POST /api/issues/:id/feedback`
- `GET /api/report/daily`

## Current Member 4 Changes

Member 4 added or changed:

- `docs/member-4-backend-plan-and-gaps.md`
- `packages/workers/src/index.ts`
- `apps/web/components/Dashboard.tsx`
- `apps/web/components/IssueDetail.tsx`
- `apps/web/app/globals.css`

## Worker Threshold Change

`packages/workers/src/index.ts` now centralizes demo thresholds in `demoThresholds`.

The important behavior change is:

- Stockout detection changed from `daysOfCover <= 2` to `daysOfCover <= 3`.

Reason:

- Current smaller demo data may not emit `stockout_risk` with the old threshold.
- This makes `POST /api/agent/run` reliably emit the stockout scenario while mock data is still being finalized.

Do not remove this unless Member 2 updates the mock data to exactly match the headline demo story.

## Frontend Stale-State Fix

`apps/web/components/Dashboard.tsx` now:

- Clears old issue cards when `Run Agent Scan` starts.
- Shows five loading cards while scanning.
- Prevents stale issue cards from being clicked during scan.

`apps/web/components/IssueDetail.tsx` now:

- Catches missing issue API errors.
- Shows a recovery message instead of throwing `Error: {"error":"Issue not found"}`.

`apps/web/app/globals.css` now:

- Adds spinner styling.
- Adds disabled button styling.

Reason:

- Backend state is currently in-memory.
- During development, server reloads can clear backend state while the browser still displays old issue cards.
- This fix prevents the demo UI from crashing.

## Member 1 Integration Notes

Member 1 should keep consuming backend APIs through `apps/web/lib/api.ts`.

Expected frontend behavior:

- Dashboard calls `GET /api/issues` on load.
- Dashboard calls `POST /api/agent/run` to scan.
- Issue cards link to `/issues/:id`.
- Issue detail calls `GET /api/issues/:id`.
- Approval queue calls `GET /api/approvals`.
- Approval buttons call approve, reject, and execute endpoints.

If Codex sees frontend fixture data and backend data conflicts, prefer shared schemas and backend API contracts.

## Member 2 Integration Notes

Member 2 owns mock data and scenario realism.

Current backend reads typed `demoData` from `packages/mock-data/src/index.ts`.

Scenario files also exist under `packages/mock-data/scenarios/`.

If merging mock data changes:

- Preserve the five MVP issue types.
- Ensure worker thresholds still emit all five core issues.
- Keep evidence records UI-friendly.
- Keep before/after verification metrics deterministic.

Five core issue types:

- `stockout_risk`
- `wrong_sku_complaint`
- `late_delivery_spike`
- `ad_waste`
- `message_backlog`

## Member 3 Integration Notes

Member 3 owns workers, agents, prompts, and risk guardrails.

Important merge rule:

- Local risk policy must remain authoritative.
- Model or agent output must not bypass local risk enforcement.
- Safe actions can auto-execute.
- Medium/high-risk actions require approval.
- Critical actions must not execute in the demo.

If Member 3 changes action names, update `packages/schemas/src/index.ts`, `packages/agents/src/index.ts`, `packages/core/src/index.ts`, and `packages/tools/src/index.ts` together.

## Simulated Source API Idea

A future useful enhancement is a thin simulated source API layer:

- `GET /api/simulated/shopee/orders`
- `GET /api/simulated/lazada/reviews`
- `GET /api/simulated/tiktok-shop/ads`
- `GET /api/simulated/whatsapp/messages`
- `GET /api/simulated/couriers/jt-express/tracking`
- `GET /api/simulated/google-sheets/inventory`

This would help the MVP story by showing that workers observe fragmented SEA marketplace systems instead of reading one clean database.

Do not prioritize this over stabilizing the main scan, approval, execution, verification, and reset flow.

## Merge Priorities

When resolving conflicts, prioritize in this order:

1. Shared schemas in `packages/schemas`
2. Stable API contracts for Member 1
3. Local risk enforcement from Member 3
4. Deterministic mock data and verification metrics from Member 2
5. Demo reset reliability
6. UI polish

## Verification Commands

Run these after merge:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Useful targeted checks:

```bash
pnpm --filter @sea-ops/web typecheck
pnpm --filter @sea-ops/workers typecheck
pnpm --filter @sea-ops/core typecheck
pnpm --filter @sea-ops/agents typecheck
pnpm --filter @sea-ops/tools typecheck
pnpm --filter @sea-ops/schemas typecheck
pnpm --filter @sea-ops/mock-data typecheck
```

## Manual Demo Test

After merge, test this flow:

1. Start app with `pnpm dev`.
2. Open `http://localhost:3000`.
3. Click `Reset Demo`.
4. Click `Run Agent Scan`.
5. Confirm five issue cards appear.
6. Open `issue-wrong_sku_complaint`.
7. Confirm evidence, diagnosis, actions, and tool logs render.
8. Open approvals page.
9. Approve one risky action.
10. Execute the approved action.
11. Verify the issue.
12. Submit merchant feedback.

## Known Risk

Backend state is currently in-memory.

This is acceptable for hackathon speed, but dev server reloads can clear state. The frontend now handles missing issue detail state gracefully.

If persistent demo state is needed, add a simple local JSON state store in `packages/core` instead of a database.
