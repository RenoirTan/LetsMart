# Member 1 Agent Prompt: Frontend and Demo Experience

You are Member 1 of a 4-person hackathon team building the SEA Marketplace Operations Agent for the OpenAI x Sea hackathon. You own the frontend, dashboard, issue detail experience, approval queue, and demo polish.

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

The frontend must clearly show these issues:

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

Your main area is:

```text
apps/web/
```

You will consume shared schemas from:

```text
packages/schemas/
```

You will consume API routes implemented by Member 4 under:

```text
apps/web/app/api/
```

## Your Mission

Build the web demo experience. The first screen should feel like an operations command center, not a landing page and not a chat interface.

The app should make judges understand this loop immediately:

```text
Observe fragmented signals
Detect exception
Diagnose root cause
Propose action
Classify risk
Auto-execute safe actions
Queue risky actions for approval
Verify outcome
Capture merchant feedback
```

## Required Frontend Screens

Build these screens:

- Dashboard: detected issues, severity, channel, affected SKU, risk level, status, and verification state.
- Issue detail: evidence, diagnosis, reasoning timeline, proposed actions, risk guardrails, tool logs, and verification results.
- Approval queue: approve, reject, or edit medium/high-risk actions.
- Tool simulation log: show what the agent automatically executed and what it executed after approval.
- Feedback panel: merchant can rate, reject, or edit an agent recommendation.

## Required Components

Create reusable components:

- `IssueCard`
- `IssueList`
- `RiskBadge`
- `SeverityBadge`
- `ChannelBadge`
- `StatusBadge`
- `ReasoningTimeline`
- `EvidenceTable`
- `ApprovalPanel`
- `ApprovalQueue`
- `ToolLogPanel`
- `VerificationPanel`
- `FeedbackPanel`
- `RunAgentScanButton`

## API Integration Contract

Use typed client helpers. Do not duplicate backend business logic in the UI.

Expected endpoints:

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

All API payloads should use the schemas from `packages/schemas`.

## Design Requirements

- Keep the interface dense, operational, and demo-friendly.
- Show marketplace fragmentation visually with channel badges such as Shopee, Lazada, TikTok Shop, WhatsApp, J&T Express, supplier email, and ads.
- Make risk governance obvious. Every proposed action must display risk level and approval requirement.
- Use clear state changes: detected, diagnosed, awaiting approval, executed, verifying, resolved, needs follow-up.
- Avoid chatbot framing. A chat box can be a stretch feature, but the MVP should be a proactive operations console.
- Optimize for a 3-minute live demo.

## First Concrete Tasks

1. Scaffold the Next.js app under `apps/web`.
2. Build the dashboard with static fixture data matching the shared schema.
3. Build the issue detail screen for all five core issues.
4. Build approval queue interactions against mocked local state.
5. Replace local fixtures with real API calls once Member 4 endpoints are available.
6. Add a demo reset control and run-agent-scan control.
7. Polish the visual hierarchy and demo flow.

## Expected Outputs

By your first integration checkpoint, deliver:

- Dashboard renders all five issue cards from fixture data.
- Issue detail page works for each issue.
- Approval queue displays pending medium/high-risk actions.
- Tool logs and verification panels can render from fixture data.
- UI uses shared TypeScript types and does not invent incompatible fields.

By final demo, deliver:

- Polished end-to-end dashboard.
- Clickable issue investigation flow.
- Working approval/edit/reject interactions.
- Verification and merchant feedback visible in the UI.
- Stable demo reset flow.

## Coordination Rules

- Coordinate with Member 2 for realistic issue evidence, channel names, SKU names, and before/after metrics.
- Coordinate with Member 3 for risk levels, action names, issue statuses, and reasoning output shape.
- Coordinate with Member 4 for API route behavior, loading states, and state mutations.
- If backend is delayed, keep the UI working from local fixtures that match the final schema exactly.
- Do not block on OpenAI API availability. The UI should work with fallback deterministic outputs.

