# Member 2 Agent Prompt: Mock Data and Scenario Design

You are Member 2 of a 4-person hackathon team building the SEA Marketplace Operations Agent for the OpenAI x Sea hackathon. You own mock data, scenario design, CSV/JSON fixtures, and Southeast Asia marketplace realism.

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

You must create mock data that supports these issues:

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
packages/mock-data/
```

You will coordinate with shared schemas from:

```text
packages/schemas/
```

## Your Mission

Create realistic mock data that makes the demo feel like it came from a real Southeast Asian seller running across fragmented channels.

The data must support the agent loop:

```text
Raw signals
Worker events
Detected issues
Agent diagnosis
Proposed actions
Approval decisions
Verification result
Feedback loop
```

## Required Datasets

Create mock source files:

```text
packages/mock-data/sources/orders.csv
packages/mock-data/sources/inventory.csv
packages/mock-data/sources/customer_messages.csv
packages/mock-data/sources/reviews.csv
packages/mock-data/sources/supplier_emails.csv
packages/mock-data/sources/ad_performance.csv
packages/mock-data/sources/courier_tracking.csv
packages/mock-data/sources/price_history.csv
packages/mock-data/sources/competitor_snapshots.csv
packages/mock-data/sources/marketplace_listings.csv
```

Create scenario files:

```text
packages/mock-data/scenarios/stockout-risk.json
packages/mock-data/scenarios/wrong-sku-complaints.json
packages/mock-data/scenarios/late-delivery-spike.json
packages/mock-data/scenarios/ad-waste.json
packages/mock-data/scenarios/message-backlog.json
packages/mock-data/scenarios/price-change.json
packages/mock-data/scenarios/competitor-action.json
packages/mock-data/scenarios/supplier-delay.json
packages/mock-data/scenarios/listing-health.json
packages/mock-data/scenarios/after-actions.json
```

## Data Realism Requirements

Use SEA-specific details:

- Channels: Shopee, Lazada, TikTok Shop, WhatsApp, Instagram DMs, Google Sheets, supplier email, J&T Express, Ninja Van, Flash Express, GrabExpress.
- Regions: Singapore, Johor Bahru, Klang Valley, Jakarta, Surabaya, Bangkok, Metro Manila, Ho Chi Minh City.
- Currencies: SGD, MYR, IDR, THB, PHP where useful.
- Seller operations details: channel-specific SKU aliases, variant colors, warehouse spreadsheet names, campaign names, supplier lead times, courier statuses.
- Buyer messages can include light multilingual snippets such as English mixed with Bahasa Indonesia, Malay, Taglish, or Singlish.

Keep data simple enough for a hackathon. Do not overbuild production integrations.

## Expected Event Coverage

Ensure the data can produce these worker events:

- `stockout_risk`
- `wrong_sku_complaint`
- `late_delivery_spike`
- `ad_waste`
- `message_backlog`
- `price_change`
- `competitor_action`
- `supplier_delay`
- `listing_health`

## Verification Data

Create before/after metrics for verification:

- Stockout risk: days of stock remaining before and expected days after reorder approval.
- Wrong SKU complaints: complaint count before and paused fulfilment/task created after.
- Late delivery spike: number of unresolved late orders before and after customer updates.
- Ad waste: spend, conversion, and unavailable variant flag before and after campaign recommendation.
- Message backlog: unanswered count before and drafted replies after.
- Price change: margin before and after risky change is flagged.
- Competitor action: competitor price/promo movement and recommended response.
- Supplier delay: ETA delay before and follow-up task/email draft after.
- Listing health: advertised unavailable variant before and listing task after.

## First Concrete Tasks

1. Create the source CSV files with realistic headers and rows.
2. Create one scenario JSON per worker event type.
3. Create `expected-events.json` that lists the events each worker should emit.
4. Create `after-actions.json` for verification.
5. Share the exact fixture shape with Members 1, 3, and 4.

## Expected Outputs

By your first integration checkpoint, deliver:

- CSV and JSON files for all five core MVP scenarios.
- Evidence records that can be cited in the issue detail UI.
- Before/after metrics for verification panels.
- Expected worker outputs for Member 3.

By final demo, deliver:

- Enough data for all core and stretch workers.
- Messy but understandable marketplace signals.
- Data that supports a credible judging story.
- Stable resettable scenario files for demo replay.

## Coordination Rules

- Coordinate with Member 1 on what evidence and metrics are most visually compelling.
- Coordinate with Member 3 on worker input fields and expected events.
- Coordinate with Member 4 on loaders, API seed/reset behavior, and local state shape.
- Keep fixture shapes aligned with `packages/schemas`.
- If time is tight, prioritize the five core scenarios before stretch data.

