# Member 4 Backend Plan and Gaps

## Role

Member 4 owns backend APIs, demo state, simulated tools, integration wiring, approval execution, verification, feedback, and demo reset reliability.

The backend goal is to make the product demoable end to end:

1. Reset demo state.
2. Run an agent scan.
3. Return detected issues.
4. Auto-execute safe actions.
5. Queue risky actions for merchant approval.
6. Execute approved simulated actions.
7. Verify outcomes.
8. Capture merchant feedback.
9. Generate a daily operations report.

## Current Repo Status

The repo already has most backend pieces scaffolded:

- API routes exist under `apps/web/app/api/`.
- State and orchestration live in `packages/core/src/index.ts`.
- Simulated tools live in `packages/tools/src/index.ts`.
- Workers live in `packages/workers/src/index.ts`.
- Agents live in `packages/agents/src/index.ts`.
- Shared Zod and TypeScript schemas live in `packages/schemas/src/index.ts`.
- Mock data exists in both `packages/mock-data/src/index.ts` and `packages/mock-data/scenarios/`.

## Required API Routes

These routes should be kept stable for Member 1 frontend integration:

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

## Identified Gaps

1. Core demo scenario consistency needs tightening.
   The prompt says the demo should show 12 units left, 9 units/day, 1.3 days cover, 17 late J&T orders, and 23 unanswered messages. Current typed mock data does not fully match those exact headline numbers.

2. `POST /api/agent/run` should always produce the five MVP issues.
   The scan flow depends on worker thresholds and mock data matching. If the data drifts, the dashboard may miss an expected issue during judging.

3. API request and response validation is incomplete.
   Feedback validates with a schema, but approval, rejection, execution, scan, report, and issue responses should also stay aligned with `packages/schemas`.

4. Risk enforcement should happen immediately before execution.
   Risk is enforced during scan, but `executeAction` should also call local risk enforcement before running any simulated tool. Local policy must remain the source of truth.

5. Approval responses may need richer payloads for the UI.
   Member 1 may need updated action, updated issue status, and execution log in one response instead of only the action or log.

6. Verification should use scenario before/after data.
   `VerificationAgent` currently returns deterministic values, but the prompt asks for `after-actions.json` or deterministic scenario state. Align this with Member 2's final fixture data.

7. Approval decisions are tracked but not exposed as a separate audit history.
   This may be fine for MVP, but the UI may need audit trail details for the issue detail or approval queue.

8. Demo IDs should be deterministic where possible.
   Random IDs work, but stable IDs make repeated judging demos and frontend fixtures easier to reason about.

9. Stretch data exists but stretch workers are stubs.
   Price change, competitor action, supplier delay, and listing health can remain stretch, but they should not interfere with the five core scenario flow.

## Backend Execution Plan

1. Stabilize shared contracts.
   Confirm final shapes for `Issue`, `IssueDetailResponse`, `ProposedAction`, `ToolExecutionLog`, `VerificationResult`, `MerchantFeedback`, approval queue items, and daily report output.

2. Align mock data with the five MVP scenarios.
   Work with Member 2 so backend data supports the exact judging story: stockout risk, wrong SKU complaints, late delivery spike, ad waste, and unanswered WhatsApp buyers.

3. Harden the scan orchestration.
   `POST /api/agent/run` should load mock data, run registered workers, diagnose issues, classify risk, auto-execute safe actions, queue risky actions, save state, and return the updated state snapshot.

4. Complete approval and execution guardrails.
   Approve and reject endpoints should update state and approval decisions. Execute should only run approved non-critical actions after local risk enforcement passes.

5. Keep simulated tools deterministic.
   Every tool should return a `ToolExecutionLog` with `simulated: true`. Tool outputs should be useful for the frontend tool log panel.

6. Finish verification and feedback flows.
   Verification should compare before/after metrics and update issue status to `resolved` or `needs_follow_up`. Feedback should validate and store merchant rating, note, and preference.

7. Add manual demo checks.
   Verify this sequence before integration freeze: reset, run scan, list issues, open issue, view safe tool logs, approve risky action, execute action, verify issue, submit feedback, and generate report.

## Team Coordination Checklist

Coordinate with Member 1 frontend:

- Freeze endpoint response shapes.
- Confirm whether approval is one-step approve-and-execute or two-step approve then execute.
- Confirm required loading and error states.
- Provide stable fixture responses if backend behavior changes during integration.

Coordinate with Member 2 data:

- Finalize exact scenario headline metrics.
- Confirm evidence records shown in the issue detail UI.
- Confirm before/after verification metrics.
- Decide whether APIs load typed `demoData` exports or scenario CSV/JSON files.

Coordinate with Member 3 workers and agents:

- Confirm worker registry entrypoint.
- Confirm action type names match `packages/schemas` exactly.
- Confirm exported local risk policy function is authoritative.
- Confirm deterministic fallback outputs for all five MVP issues.
- Ensure model output cannot bypass local guardrails.

Coordinate with the whole team:

- Prioritize the five MVP scenarios over stretch scenarios.
- Freeze API contracts after the first integration checkpoint.
- Rehearse one reliable 3-minute demo script.
- Keep reset and fallback behavior stable for repeated judging demos.

## Immediate Next Tasks

1. Fix scenario data and thresholds so all five MVP issues always appear.
2. Export or centralize risk classification so execution re-checks policy before tools run.
3. Add stronger request/response validation around approval and action endpoints.
4. Align verification with `after-actions.json` or final deterministic scenario data.
5. Confirm final response payloads with Member 1 before UI integration is locked.
