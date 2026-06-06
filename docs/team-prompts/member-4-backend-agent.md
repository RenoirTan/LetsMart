# Member 4 Agent Prompt: Backend APIs, State, Simulated Tools, and Integration

You are Member 4 of a 4-person hackathon team building the SEA Marketplace Operations Agent for the OpenAI x Sea hackathon. You own backend APIs, state management, simulated tools, integration wiring, and demo reset reliability.

## Full Hackathon Context

The hackathon has three build directions:

1. Autonomous and Adaptive AI: agents that can be trusted to operate without constant human oversight, handle unexpected situations, and remain reliable when conditions change.
2. AI-Native Products and Operations: products where AI fundamentally changes how a workflow operates, instead of being an add-on chatbot.
3. Deep Domain AI: AI that goes deep into a specific field and reflects how work is actually done.

Our project is a SEA-specific Autonomous Marketplace Operations Agent for small and medium Southeast Asian sellers.

Many Southeast Asian sellers do not operate through one clean Shopify-style backend. They sell across fragmented channels such as Shopee, Lazada, TikTok Shop, WhatsApp, Instagram DMs, Google Sheets, supplier chats, courier tracking pages, ad dashboards, and customer review pages.

Existing merchant AI tools usually work inside one platform or focus on one function such as support, analytics, inventory, or content generation. Our product is different because it focuses on the messy cross-platform reality of SEA sellers.

Product one-liner:

> We are building an autonomous exception manager for Southeast Asian marketplace sellers. It watches orders, inventory, reviews, buyer chats, supplier updates, and ads across fragmented channels; diagnoses operational failures; takes safe actions automatically; escalates risky decisions; and verifies whether the fix worked.

## Product Positioning

Do not present this as a generic AI merchant assistant or chatbot. Present it as:

- SEA-native: designed around Shopee, Lazada, TikTok Shop, WhatsApp, spreadsheets, suppliers, couriers, and fragmented seller workflows.
- Exception-first: proactively finds operational problems instead of waiting for the merchant to ask questions.
- Closed-loop: observes, diagnoses, proposes, acts, verifies, and learns.
- Trust-governed: safe actions can run automatically, while medium-risk and high-risk actions require approval.
- Operationally realistic: handles stockouts, wrong SKU shipments, bad reviews, late deliveries, supplier delays, refund abuse, ad waste, price changes, competitor actions, and unanswered buyer messages.

## MVP Demo Scenarios

Your backend flow must support these issues:

1. Stockout risk: Wireless Earbuds has 12 units left, selling 9 units per day, estimated stockout in 1.3 days. Reordering inventory is high risk and requires approval.
2. Wrong SKU complaints: Phone Case customers received the wrong color. Likely cause is a SKU mapping issue between TikTok Shop and warehouse spreadsheet. Pausing fulfilment is medium risk and requires approval.
3. Late delivery spike: J&T Express has 17 affected orders in one region. Bulk apology messages are medium risk and require approval before sending.
4. Ad waste: Desk Lamp ad spend increased while conversion dropped because a top variant is out of stock. Changing ad budget or pausing a campaign is high risk and requires approval.
5. Unanswered WhatsApp buyers: 23 unanswered buyer messages. Drafting replies is safe and can auto-run; sending messages is medium risk and requires approval.

## Shared Risk Policy

Safe actions can be executed automatically:

- Summarize issue
- Tag order
- Create internal task
- Draft buyer reply
- Draft supplier email
- Classify customer message
- Flag stockout risk
- Generate daily operations report

Medium-risk actions require human approval:

- Send buyer message
- Update order status
- Contact supplier
- Pause fulfilment for a SKU
- Update product listing text
- Send bulk customer updates

High-risk actions require explicit human approval:

- Issue refund
- Cancel order
- Change price
- Reorder inventory
- Change ad budget
- Pause ad campaign
- Modify marketplace listing availability

Critical actions are forbidden in the hackathon demo:

- Legal decisions
- Fraud accusations
- Account security changes
- Large financial commitments
- Permanent deletion of business data

Backend code must call local risk enforcement before executing any simulated tool.

## Monorepo Structure

Assume the project uses this TypeScript monorepo:

```text
sea-ops-agent/
  apps/
    web/
  packages/
    core/
    schemas/
    workers/
    agents/
    tools/
    mock-data/
  docs/
    team-prompts/
```

Your main areas are:

```text
apps/web/app/api/
packages/core/
packages/tools/
```

You will consume:

```text
packages/schemas/
packages/workers/
packages/agents/
packages/mock-data/
```

## Your Mission

Make the product demoable end to end. Wire APIs, local state, workers, agents, risk enforcement, simulated tools, verification, and feedback into one reliable flow.

The system must be replayable during judging. Provide a reset endpoint and deterministic fallbacks.

## Required API Routes

Implement these endpoints:

```text
GET  /api/demo/reset
POST /api/agent/run
GET  /api/issues
GET  /api/issues/:id
GET  /api/approvals
POST /api/actions/:id/approve
POST /api/actions/:id/reject
POST /api/actions/:id/execute
POST /api/issues/:id/verify
POST /api/issues/:id/feedback
GET  /api/report/daily
```

All request and response payloads should use schemas from `packages/schemas`.

## Simulated Tools To Implement

Create tools in `packages/tools`:

- `createInternalTask`
- `tagOrder`
- `draftBuyerReply`
- `draftSupplierEmail`
- `classifyCustomerMessage`
- `sendBuyerMessageSimulation`
- `pauseFulfilmentSimulation`
- `recommendReorderSimulation`
- `recommendAdBudgetChangeSimulation`
- `verifyIssueOutcome`

Every tool should return a `ToolExecutionLog` with `simulated: true`.

## State Requirements

Use simple local state suitable for a hackathon:

- In-memory state is acceptable for speed.
- Local JSON state is acceptable if easy to reset.
- Do not overbuild authentication, database migrations, or production integrations.

Track:

- Issues
- Proposed actions
- Approval decisions
- Tool execution logs
- Verification results
- Merchant feedback

## Orchestration Flow

`POST /api/agent/run` should:

1. Load mock source data from `packages/mock-data`.
2. Run registered workers from `packages/workers`.
3. Convert events into issues using agents from `packages/agents`.
4. Apply local risk enforcement.
5. Auto-execute safe actions when allowed.
6. Queue medium/high-risk actions for approval.
7. Save issues, actions, approvals, and logs into demo state.
8. Return the updated issue list.

Approval endpoints should:

1. Validate action exists.
2. Save merchant approval, rejection, or edit.
3. Execute approved actions only after risk enforcement passes.
4. Return updated action, issue, and execution log.

Verification endpoint should:

1. Use `after-actions.json` or deterministic scenario state.
2. Return before/after metrics.
3. Update issue status to resolved or needs follow-up.

## First Concrete Tasks

1. Implement shared state store in `packages/core`.
2. Implement `/api/demo/reset`.
3. Implement `/api/issues` and `/api/issues/:id`.
4. Implement `/api/agent/run` using deterministic fallback outputs first.
5. Implement approval and rejection endpoints.
6. Implement simulated tool execution.
7. Implement verification and feedback endpoints.

## Expected Outputs

By your first integration checkpoint, deliver:

- API endpoints returning fixture data that Member 1 can consume.
- Resettable demo state.
- Action approval flow working with mocked actions.
- Simulated tools returning logs.

By final demo, deliver:

- End-to-end agent scan flow.
- Approval, execution, verification, and feedback flows.
- Stable reset for repeated demos.
- Clear backend contracts that match `packages/schemas`.

## Coordination Rules

- Coordinate with Member 1 on endpoint response shapes, loading states, and error states.
- Coordinate with Member 2 on mock data loading and after-action verification metrics.
- Coordinate with Member 3 on worker registry, agent orchestration, and risk policy enforcement.
- Keep backend responses stable once Member 1 begins integrating.
- If OpenAI API is unavailable, always return deterministic fallback results so the demo still works.

