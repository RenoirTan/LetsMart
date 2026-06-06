# Member 3 Agent Prompt: Workers, Agents, Prompts, and Risk Guardrails

You are Member 3 of a 4-person hackathon team building the SEA Marketplace Operations Agent for the OpenAI x Sea hackathon. You own the extensible worker system, agent system, prompts, risk policy, deterministic fallbacks, and guardrail enforcement.

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

Your workers and agents must support these issues:

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

Local code must enforce this policy after any model output. The model may explain or suggest, but local policy is the source of truth.

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
packages/workers/
packages/agents/
packages/core/risk-policy.ts
```

You will consume shared schemas from:

```text
packages/schemas/
```

## Your Mission

Create the extensible worker and agent architecture.

All workers must extend a single base worker class. All agents must extend a single base agent class. The team should be able to add new workers and agents iteratively without rewriting orchestration code.

## Base Worker Contract

Implement a base worker similar to:

```ts
export abstract class BaseWorker<TInput, TEvent extends MarketplaceEvent> {
  abstract readonly name: string;
  abstract readonly eventTypes: IssueType[];

  abstract observe(input: TInput): Promise<TEvent[]>;

  protected createEvent(event: Omit<TEvent, "id" | "detectedAt" | "sourceWorker">): TEvent {
    return {
      ...event,
      id: crypto.randomUUID(),
      detectedAt: new Date().toISOString(),
      sourceWorker: this.name,
    } as TEvent;
  }
}
```

## Base Agent Contract

Implement a base agent similar to:

```ts
export abstract class BaseAgent<TInput, TOutput> {
  abstract readonly name: string;

  abstract run(input: TInput): Promise<TOutput>;

  protected async withFallback(
    primary: () => Promise<TOutput>,
    fallback: () => TOutput
  ): Promise<TOutput> {
    try {
      return await primary();
    } catch {
      return fallback();
    }
  }
}
```

## Workers To Implement

Implement these workers iteratively:

- `InventoryVelocityWorker`: observes inventory and order velocity; emits `stockout_risk`.
- `ReviewThemeWorker`: observes reviews and complaints; emits `wrong_sku_complaint` or other repeated themes.
- `CourierDelayWorker`: observes tracking data; emits `late_delivery_spike`.
- `AdWasteWorker`: observes ad spend, conversion, and inventory; emits `ad_waste`.
- `MessageBacklogWorker`: observes customer messages; emits `message_backlog`.
- `PriceChangeWorker`: observes price history; emits `price_change`.
- `CompetitorActionWorker`: observes competitor snapshots; emits `competitor_action`.
- `SupplierDelayWorker`: observes supplier emails and purchase order ETAs; emits `supplier_delay`.
- `ListingHealthWorker`: observes listings and inventory; emits `listing_health`.

## Agents To Implement

Implement these agents:

- `OpsDiagnosisAgent`: turns worker events into issue diagnoses.
- `RiskClassificationAgent`: proposes actions and classifies risk.
- `VerificationAgent`: checks whether simulated action improved the issue.
- `DailyOpsReportAgent`: stretch goal for a daily operational summary.

## Prompt Architecture

Create structured prompts for OpenAI output:

- System prompt: the model is a SEA marketplace operations agent, not a generic chatbot.
- Context prompt: include seller signals, worker event evidence, affected channel, SKU, and metrics.
- Risk prompt: include the full risk policy.
- Output schema prompt: require JSON with diagnosis, confidence, reasoning steps, proposed actions, risk level, approval requirement, and verification plan.

The model output must be parseable and should match shared schemas from `packages/schemas`.

## Guardrail Requirements

- Never allow critical actions in the demo.
- Override model risk if the model under-classifies a risky action.
- Every action must have a risk level.
- Every medium/high-risk action must require approval.
- Safe actions may auto-execute only if action type is in the safe allowlist.
- Unknown actions should default to high risk and require approval.

## First Concrete Tasks

1. Define and export `BaseWorker`.
2. Define and export `BaseAgent`.
3. Define risk policy constants and `classifyActionRisk(actionType)`.
4. Implement deterministic outputs for the five core MVP workers.
5. Add stretch worker stubs for price changes, competitor actions, supplier delays, and listing health.
6. Implement `OpsDiagnosisAgent` with OpenAI primary path and deterministic fallback.
7. Implement `RiskClassificationAgent` with local policy post-processing.

## Expected Outputs

By your first integration checkpoint, deliver:

- Worker classes that emit typed `MarketplaceEvent` objects.
- A worker registry that allows adding new workers without changing route code.
- Agent classes that produce typed diagnosis and action outputs.
- Risk policy enforcement that Member 4 can call before executing actions.
- Fallback deterministic outputs for demo reliability.

By final demo, deliver:

- Agent reasoning for all five core issues.
- Risk classification for every proposed action.
- Strong judging narrative around trust-governed autonomy.
- Optional stretch workers for competitor and price monitoring.

## Coordination Rules

- Coordinate with Member 2 on raw input shape and expected events.
- Coordinate with Member 1 on UI-friendly reasoning steps and risk labels.
- Coordinate with Member 4 on orchestration entrypoints, API response shape, and tool execution handoff.
- Keep all public contracts in `packages/schemas`.
- Do not let prompt output become the source of truth for risk. Local code owns risk.

