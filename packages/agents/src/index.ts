import OpenAI from "openai";
import { actionTypeSchema, issueSchema, proposedActionSchema, verificationResultSchema } from "@sea-ops/schemas";
import type { ActionType, Issue, IssueType, MarketplaceEvent, ProposedAction, VerificationResult } from "@sea-ops/schemas";

const id = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;

declare const process: { env?: Record<string, string | undefined> } | undefined;

export abstract class BaseAgent<TInput, TOutput> {
  abstract readonly name: string;

  abstract run(input: TInput): Promise<TOutput>;

  protected async withFallback(primary: () => Promise<TOutput>, fallback: () => TOutput): Promise<TOutput> {
    try {
      return await primary();
    } catch {
      return fallback();
    }
  }
}

export interface BuyerReplyDraftInput {
  messages: Array<{
    messageId: string;
    buyerName: string;
    body: string;
    productName?: string;
    status?: string;
  }>;
  context: Record<string, unknown>;
}

export interface BuyerReplyDraft {
  messageId: string;
  buyerName: string;
  problemType: string;
  urgency: "low" | "medium" | "high";
  originalMessage: string;
  draftText: string;
}

export interface BuyerReplyDraftMetadata {
  agentUsed: "BuyerReplyDraftAgent";
  draftSource: "openai" | "fallback";
  model: string;
  fallbackReason?: string;
}

export interface BuyerReplyDraftResult {
  drafts: BuyerReplyDraft[];
  metadata: BuyerReplyDraftMetadata;
}

const issueCopy: Record<IssueType, Pick<Issue, "title" | "summary">> = {
  stockout_risk: {
    title: "Wireless Earbuds may stock out before inbound replenishment",
    summary: "Shopee velocity is consuming sellable stock faster than the inbound PO can arrive.",
  },
  wrong_sku_complaint: {
    title: "Phone Case wrong-SKU complaints are clustering",
    summary: "Recent Lazada and Shopee reviews mention iPhone 15 orders receiving an iPhone 14 Pro case.",
  },
  late_delivery_spike: {
    title: "J&T Express late-delivery spike in Selangor",
    summary: "Several shipments breached promised delivery windows and are stuck at hub or linehaul stages.",
  },
  ad_waste: {
    title: "Desk Lamp campaign is spending into low ROAS and low stock",
    summary: "TikTok Shop ads continue to spend despite poor conversion efficiency and limited stock.",
  },
  message_backlog: {
    title: "WhatsApp buyer replies are falling behind",
    summary: "Unanswered WhatsApp and Instagram DM messages include stock checks, delivery requests, and complaint follow-ups.",
  },
  price_change: { title: "Risky price change detected", summary: "A seller price movement may affect margin or conversion." },
  competitor_action: { title: "Competitor action detected", summary: "A competitor changed price, voucher, or stock availability." },
  supplier_delay: { title: "Supplier delay detected", summary: "Supplier signals suggest a replenishment delay." },
  listing_health: { title: "Listing health mismatch detected", summary: "A listed variant may not match operational inventory state." },
  trend_signal: { title: "Marketplace trend opportunity detected", summary: "A fast-growing product or keyword trend may be worth merchant review." },
};

export class OpsDiagnosisAgent extends BaseAgent<MarketplaceEvent[], Issue[]> {
  readonly name = "OpsDiagnosisAgent";

  async run(events: MarketplaceEvent[]): Promise<Issue[]> {
    return this.withFallback(
      async () => {
        const modelOutput = await completeJson<DiagnosisModelOutput>(
          "You are a Southeast Asia marketplace operations diagnosis agent. Turn worker events into issue diagnoses. Return JSON only with an issues array. Each issue must include eventId, title, summary, rootCauseHypothesis, confidence, reasoningSteps, and supportingEvidenceIds.",
          { events },
        );

        return buildIssuesFromModel(events, modelOutput);
      },
      () => deterministicIssues(events),
    );
  }
}

export class RiskClassificationAgent extends BaseAgent<Issue, ProposedAction[]> {
  readonly name = "RiskClassificationAgent";

  async run(issue: Issue): Promise<ProposedAction[]> {
    return this.withFallback(
      async () => {
        const modelOutput = await completeJson<ActionModelOutput>(
          `You are a SEA marketplace operations risk agent. Propose safe, useful marketplace operations actions for the issue. Return JSON only with an actions array. Allowed actionType values: ${actionTypeSchema.options.join(", ")}. Do not invent action types. Use safe, medium, high, or critical risk levels. Medium/high/critical actions require approval.`,
          { issue },
        );

        return buildActionsFromModel(issue, modelOutput);
      },
      () => deterministicActions(issue),
    );
  }
}

export class VerificationAgent extends BaseAgent<Issue, VerificationResult> {
  readonly name = "VerificationAgent";

  async run(issue: Issue): Promise<VerificationResult> {
    return this.withFallback(
      async () => {
        const modelOutput = await completeJson<VerificationModelOutput>(
          "You are a SEA marketplace operations verification agent. Compare the issue evidence and executed or proposed actions. Return JSON only with status, metricBefore, metricAfter, and notes.",
          { issue },
        );

        return buildVerificationFromModel(issue, modelOutput);
      },
      () => deterministicVerification(issue),
    );
  }
}

export class BuyerReplyDraftAgent extends BaseAgent<BuyerReplyDraftInput, BuyerReplyDraft[]> {
  readonly name = "BuyerReplyDraftAgent";

  async run(input: BuyerReplyDraftInput): Promise<BuyerReplyDraft[]> {
    return (await this.runWithMetadata(input)).drafts;
  }

  async runWithMetadata(input: BuyerReplyDraftInput): Promise<BuyerReplyDraftResult> {
    const model = process?.env?.OPENAI_MODEL ?? "gpt-4.1-mini";

    try {
      logAgent(this.name, `OpenAI request model=${model} messages=${input.messages.length}`);
      const modelOutput = await completeJson<BuyerReplyDraftModelOutput>(
        "You are a SEA marketplace support agent. Draft concise, empathetic WhatsApp replies for each buyer message. Return JSON only with a drafts array. Each draft must include messageId, buyerName, problemType, urgency, originalMessage, and draftText. Do not promise refunds or replacements as already completed. Ask for order details, tracking numbers, photos, or videos when needed. Use clear marketplace support language suitable for Malaysia/Singapore/Indonesia buyers.",
        input,
      );

      const drafts = buildBuyerReplyDrafts(input, modelOutput);
      logAgent(this.name, `OpenAI success model=${model} drafts=${drafts.length}`);

      return {
        drafts,
        metadata: {
          agentUsed: "BuyerReplyDraftAgent",
          draftSource: "openai",
          model,
        },
      };
    } catch (error) {
      const fallbackReason = error instanceof Error ? error.message : "Unknown OpenAI error";
      logAgent(this.name, `OpenAI fallback model=${model} reason="${fallbackReason}"`);

      return {
        drafts: deterministicBuyerReplyDrafts(input),
        metadata: {
          agentUsed: "BuyerReplyDraftAgent",
          draftSource: "fallback",
          model,
          fallbackReason,
        },
      };
    }
  }
}

const agentLogsEnabled = () => process?.env?.AGENT_LOGS !== "0";

function logAgent(agentName: string, message: string) {
  if (!agentLogsEnabled()) return;
  console.log(`[agent:${agentName}] ${message}`);
}

function deterministicIssues(events: MarketplaceEvent[]): Issue[] {
    const now = new Date().toISOString();
    return events.map((event) => ({
      id: `issue-${event.type}`,
      type: event.type,
      title: issueCopy[event.type].title,
      summary: issueCopy[event.type].summary,
      status: "diagnosed",
      channel: event.channel,
      affectedSku: event.sku,
      productName: event.productName,
      severity: event.severity,
      events: [event],
      diagnosis: {
        rootCauseHypothesis: rootCauseFor(event.type),
        confidence: confidenceFor(event.type),
        reasoningSteps: reasoningFor(event),
        supportingEvidenceIds: event.evidence.map((evidence) => evidence.recordId),
      },
      proposedActions: [],
      createdAt: now,
      updatedAt: now,
    }));
  }

function deterministicActions(issue: Issue): ProposedAction[] {
  return actionCatalog(issue).map((action) => ({
      id: `action-${issue.type}-${action.actionType}`,
      issueId: issue.id,
      status: "drafted",
      ...action,
    }));
}

function deterministicVerification(issue: Issue): VerificationResult {
    const now = new Date().toISOString();
    const first = issue.events[0];
    switch (issue.type) {
      case "stockout_risk":
        return { issueId: issue.id, status: "improved", metricBefore: { daysOfCover: String(first.metrics.daysOfCover ?? "1.1") }, metricAfter: { daysOfCover: "5.8" }, notes: "Reorder recommendation and internal stockout flag give the merchant a safe next step without changing inventory automatically.", verifiedAt: now };
      case "wrong_sku_complaint":
        return { issueId: issue.id, status: "improved", metricBefore: { complaintCount: String(first.metrics.complaintCount ?? "3") }, metricAfter: { complaintCount: "1 projected" }, notes: "Pick-pack audit task and buyer reply drafts address the root operational error.", verifiedAt: now };
      case "late_delivery_spike":
        return { issueId: issue.id, status: "needs_more_time", metricBefore: { delayedOrders: String(first.metrics.delayedOrders ?? "4") }, metricAfter: { taggedOrders: "4" }, notes: "Orders were tagged and buyer-update action is queued; courier performance needs another scan window.", verifiedAt: now };
      case "ad_waste":
        return { issueId: issue.id, status: "improved", metricBefore: { roas: String(first.metrics.roas ?? "0.32") }, metricAfter: { projectedRoas: "1.15" }, notes: "Budget change is recommendation-only until approved because campaign budget is high risk.", verifiedAt: now };
      case "message_backlog":
        return { issueId: issue.id, status: "improved", metricBefore: { unanswered: String(first.metrics.unansweredCount ?? "6") }, metricAfter: { draftedReplies: "5" }, notes: "Messages were classified and reply drafts prepared without sending buyer messages automatically.", verifiedAt: now };
      default:
        return { issueId: issue.id, status: "unchanged", metricBefore: {}, metricAfter: {}, notes: "No verification rule exists for this issue type yet.", verifiedAt: now };
    }
}

function rootCauseFor(type: IssueType): string {
  return {
    stockout_risk: "Marketplace velocity is outpacing sellable stock, while inbound replenishment arrives after the likely stockout date.",
    wrong_sku_complaint: "A pick-pack or bin-label mismatch is causing iPhone 15 clear case orders to receive an iPhone 14 Pro variant.",
    late_delivery_spike: "J&T Express appears congested around Selangor hub/linehaul lanes, creating repeated SLA breaches.",
    ad_waste: "The campaign is spending against a product with low ROAS and low stock, making additional paid traffic operationally unsafe.",
    message_backlog: "Buyer conversations are fragmented across WhatsApp and Instagram DM, causing urgent pre-sale and post-sale replies to age out.",
    price_change: "Recent price movement may have changed seller margin or demand unexpectedly.",
    competitor_action: "Competitor marketplace activity may affect conversion or buy-box pressure.",
    supplier_delay: "Supplier replenishment signals indicate a potential ETA slip.",
    listing_health: "Listing and inventory systems disagree on sellable availability.",
    trend_signal: "Marketplace demand signals show a fast-growing keyword or product opportunity that has not been reviewed yet.",
  }[type];
}

function confidenceFor(type: IssueType): number {
  return type === "wrong_sku_complaint" ? 0.91 : type === "stockout_risk" ? 0.88 : 0.82;
}

function reasoningFor(event: MarketplaceEvent): string[] {
  return [
    `Observed ${event.evidence.length} supporting records from ${event.sourceWorker}.`,
    `Grouped the signal as ${event.type.replaceAll("_", " ")} on ${event.channel.replaceAll("_", " ")}.`,
    `Compared operational metrics: ${Object.entries(event.metrics).slice(0, 3).map(([key, value]) => `${key}=${value}`).join(", ")}.`,
    "Selected actions under local risk policy so unsafe marketplace changes require merchant approval.",
  ];
}

function actionCatalog(issue: Issue): Array<Omit<ProposedAction, "id" | "issueId" | "status">> {
  const commonSafe = {
    riskLevel: "safe" as const,
    requiresApproval: false,
  };

  const commonMedium = {
    riskLevel: "medium" as const,
    requiresApproval: true,
  };

  const commonHigh = {
    riskLevel: "high" as const,
    requiresApproval: true,
  };

  const action = (actionType: ActionType, title: string, description: string, expectedOutcome: string, risk: typeof commonSafe | typeof commonMedium | typeof commonHigh, payload: Record<string, unknown> = {}) => ({
    actionType,
    title,
    description,
    expectedOutcome,
    payload: { issueId: issue.id, sku: issue.affectedSku, productName: issue.productName, ...payload },
    ...risk,
  });

  switch (issue.type) {
    case "stockout_risk":
      return [
        action("flag_stockout", "Flag stockout risk", "Add an internal stockout-risk flag for the Wireless Earbuds SKU.", "Ops team sees the risk before overselling.", commonSafe),
        action("create_internal_task", "Create replenishment task", "Create a same-day task to confirm supplier ETA and warehouse stock count.", "Merchant has a concrete next operational task.", commonSafe),
        action("reorder_inventory", "Recommend reorder quantity", "Recommend a 250-unit reorder but do not place it automatically.", "Merchant can approve a replenishment decision with context.", commonHigh, { recommendedQty: 250 }),
      ];
    case "wrong_sku_complaint":
      return [
        action("tag_order", "Tag affected orders", "Tag recent Phone Case orders for pick-pack audit.", "Warehouse team can isolate potentially wrong-SKU shipments.", commonSafe),
        action("draft_buyer_reply", "Draft buyer recovery reply", "Draft a bilingual apology and exchange instruction for affected buyers.", "Merchant can send consistent recovery messages faster.", commonSafe),
        action("send_buyer_message", "Send buyer recovery messages", "Send the drafted reply to affected buyers after approval.", "Affected buyers receive proactive recovery communication.", commonMedium),
      ];
    case "late_delivery_spike":
      return [
        action("tag_order", "Tag delayed J&T orders", "Tag delayed Selangor orders for courier follow-up.", "Support can filter impacted orders quickly.", commonSafe),
        action("send_bulk_customer_update", "Send proactive delivery update", "Notify impacted buyers that J&T deliveries are delayed.", "Reduces inbound WISMO messages and buyer anxiety.", commonMedium, { courier: "J&T Express", region: "Selangor" }),
      ];
    case "ad_waste":
      return [
        action("summarize_issue", "Summarize ad waste", "Create a concise campaign waste summary for the merchant.", "Merchant understands spend, ROAS, and stock constraints.", commonSafe),
        action("change_ad_budget", "Recommend budget reduction", "Recommend lowering TikTok Desk Lamp spend until ROAS and stock recover.", "Prevents further waste after merchant approval.", commonHigh, { campaignId: issue.events[0]?.entityId, recommendedDailyBudget: 20 }),
      ];
    case "message_backlog":
      return [
        action("classify_message", "Classify inbox backlog", "Group unanswered messages by stock check, delivery request, complaint, and COD question.", "Merchant can triage the inbox in priority order.", commonSafe),
        action("draft_buyer_reply", "Draft WhatsApp replies", "Prepare SEA-localized reply drafts without sending them.", "Support can clear the queue faster.", commonSafe),
        action("send_buyer_message", "Send drafted replies", "Send selected buyer replies after approval.", "Buyers receive timely answers once merchant approves.", commonMedium),
      ];
    case "trend_signal":
      return [
        action("create_internal_task", "Review trend opportunity", "Create a merchant task to review the detected marketplace trend.", "Merchant can decide whether to source, list, or promote the opportunity.", commonSafe),
        action("draft_supplier_email", "Draft supplier inquiry", "Draft a supplier inquiry for pricing, MOQ, and lead time on the trending item.", "Merchant can quickly validate supply availability without sending automatically.", commonSafe),
      ];
    default:
      return [action("summarize_issue", "Summarize issue", "Summarize the detected marketplace issue.", "Merchant can review the issue.", commonSafe)];
  }
}

export const promptTemplates = {
  opsDiagnosis: "Return a JSON issue diagnosis with rootCauseHypothesis, confidence, reasoningSteps, and supportingEvidenceIds. Do not propose forbidden actions.",
  riskClassification: "Classify each proposed marketplace action as safe, medium, high, or critical. Explain why approval is required when risk is not safe.",
  verification: "Compare before and after operational metrics and return improved, unchanged, worse, or needs_more_time.",
};

interface DiagnosisModelOutput {
  issues?: Array<{
    eventId?: unknown;
    title?: unknown;
    summary?: unknown;
    rootCauseHypothesis?: unknown;
    confidence?: unknown;
    reasoningSteps?: unknown;
    supportingEvidenceIds?: unknown;
  }>;
}

interface ActionModelOutput {
  actions?: Array<{
    actionType?: unknown;
    title?: unknown;
    description?: unknown;
    expectedOutcome?: unknown;
    riskLevel?: unknown;
    requiresApproval?: unknown;
    payload?: unknown;
  }>;
}

interface VerificationModelOutput {
  status?: unknown;
  metricBefore?: unknown;
  metricAfter?: unknown;
  notes?: unknown;
}

interface BuyerReplyDraftModelOutput {
  drafts?: Array<{
    messageId?: unknown;
    buyerName?: unknown;
    problemType?: unknown;
    urgency?: unknown;
    originalMessage?: unknown;
    draftText?: unknown;
  }>;
}

async function completeJson<TOutput>(systemPrompt: string, payload: unknown): Promise<TOutput> {
  const client = createOpenAIClient();
  if (!client) throw new Error("OPENAI_API_KEY is not set");

  const response = await client.chat.completions.create({
    model: process?.env?.OPENAI_MODEL ?? "gpt-4.1-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(payload, null, 2) },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("OpenAI returned an empty response");
  return JSON.parse(content) as TOutput;
}

function createOpenAIClient(): OpenAI | undefined {
  const apiKey = process?.env?.OPENAI_API_KEY;
  if (!apiKey) return undefined;
  return new OpenAI({ apiKey });
}

function buildIssuesFromModel(events: MarketplaceEvent[], output: DiagnosisModelOutput): Issue[] {
  const now = new Date().toISOString();
  const modelIssues = Array.isArray(output.issues) ? output.issues : [];

  return events.map((event, index) => {
    const fallback = issueCopy[event.type];
    const modelIssue = modelIssues.find((candidate) => candidate.eventId === event.id) ?? modelIssues[index];
    const evidenceIds = event.evidence.map((evidence) => evidence.recordId);

    return issueSchema.parse({
      id: `issue-${event.type}`,
      type: event.type,
      title: stringOr(modelIssue?.title, fallback.title),
      summary: stringOr(modelIssue?.summary, fallback.summary),
      status: "diagnosed",
      channel: event.channel,
      affectedSku: event.sku,
      productName: event.productName,
      severity: event.severity,
      events: [event],
      diagnosis: {
        rootCauseHypothesis: stringOr(modelIssue?.rootCauseHypothesis, rootCauseFor(event.type)),
        confidence: confidenceOr(modelIssue?.confidence, confidenceFor(event.type)),
        reasoningSteps: stringArrayOr(modelIssue?.reasoningSteps, reasoningFor(event)),
        supportingEvidenceIds: stringArrayOr(modelIssue?.supportingEvidenceIds, evidenceIds).filter((recordId) => evidenceIds.includes(recordId)),
      },
      proposedActions: [],
      createdAt: now,
      updatedAt: now,
    });
  });
}

function buildActionsFromModel(issue: Issue, output: ActionModelOutput): ProposedAction[] {
  const fallbackActions = deterministicActions(issue);
  const modelActions = Array.isArray(output.actions) ? output.actions : [];
  const actions: ProposedAction[] = [];
  const seen = new Set<ActionType>();

  for (const modelAction of modelActions) {
    const parsedType = actionTypeSchema.safeParse(modelAction.actionType);
    if (!parsedType.success || seen.has(parsedType.data)) continue;
    seen.add(parsedType.data);

    const fallback = fallbackActions.find((action) => action.actionType === parsedType.data);
    const riskLevel = riskLevelOr(modelAction.riskLevel, fallback?.riskLevel ?? "high");
    const requiresApproval = typeof modelAction.requiresApproval === "boolean" ? modelAction.requiresApproval : riskLevel !== "safe";

    actions.push(proposedActionSchema.parse({
      id: `action-${issue.type}-${parsedType.data}`,
      issueId: issue.id,
      actionType: parsedType.data,
      title: stringOr(modelAction.title, fallback?.title ?? parsedType.data.replaceAll("_", " ")),
      description: stringOr(modelAction.description, fallback?.description ?? "Review and act on this marketplace issue."),
      expectedOutcome: stringOr(modelAction.expectedOutcome, fallback?.expectedOutcome ?? "Merchant can review the issue with operational context."),
      riskLevel,
      requiresApproval,
      payload: {
        issueId: issue.id,
        sku: issue.affectedSku,
        productName: issue.productName,
        ...objectOr(modelAction.payload, {}),
      },
      status: "drafted",
    }));
  }

  if (actions.length === 0) throw new Error("OpenAI returned no valid actions");
  return actions;
}

function buildVerificationFromModel(issue: Issue, output: VerificationModelOutput): VerificationResult {
  const status = output.status === "improved" || output.status === "unchanged" || output.status === "worse" || output.status === "needs_more_time"
    ? output.status
    : "unchanged";

  return verificationResultSchema.parse({
    issueId: issue.id,
    status,
    metricBefore: metricRecordOr(output.metricBefore, {}),
    metricAfter: metricRecordOr(output.metricAfter, {}),
    notes: stringOr(output.notes, "The model could not confidently verify a material operational change yet."),
    verifiedAt: new Date().toISOString(),
  });
}

function buildBuyerReplyDrafts(input: BuyerReplyDraftInput, output: BuyerReplyDraftModelOutput): BuyerReplyDraft[] {
  const fallbackDrafts = deterministicBuyerReplyDrafts(input);
  const modelDrafts = Array.isArray(output.drafts) ? output.drafts : [];

  return input.messages.map((message) => {
    const fallback = fallbackDrafts.find((draft) => draft.messageId === message.messageId) ?? fallbackDraftForMessage(message);
    const modelDraft = modelDrafts.find((draft) => draft.messageId === message.messageId);
    const problemType = stringOr(modelDraft?.problemType, fallback.problemType);

    return {
      messageId: message.messageId,
      buyerName: stringOr(modelDraft?.buyerName, message.buyerName),
      problemType,
      urgency: urgencyOr(modelDraft?.urgency, fallback.urgency),
      originalMessage: stringOr(modelDraft?.originalMessage, message.body),
      draftText: stringOr(modelDraft?.draftText, fallback.draftText),
    };
  });
}

function deterministicBuyerReplyDrafts(input: BuyerReplyDraftInput): BuyerReplyDraft[] {
  return input.messages.map(fallbackDraftForMessage);
}

function fallbackDraftForMessage(message: BuyerReplyDraftInput["messages"][number]): BuyerReplyDraft {
  const problemType = classifyBuyerProblem(message.body);
  return {
    messageId: message.messageId,
    buyerName: message.buyerName,
    problemType,
    urgency: urgencyForBuyerProblem(problemType),
    originalMessage: message.body,
    draftText: fallbackBuyerReply(message, problemType),
  };
}

function classifyBuyerProblem(body: string): string {
  const text = body.toLowerCase();
  if (/refund|return|money back|bayar balik/.test(text)) return "refund_request";
  if (/exchange|change|replace|replacement/.test(text)) return "exchange_request";
  if (/broken|defect|rosak|no sound|not working|switch|scratch|damaged/.test(text)) return "defective_product";
  if (/wrong|salah|model|colour|color|case|received one/.test(text)) return "wrong_item";
  if (/parcel|tracking|not moved|delay|lambat|ship|delivery|courier/.test(text)) return "shipping_delay";
  if (/address|alamat/.test(text)) return "address_change";
  if (/cod|cash|payment|bayar|deducted/.test(text)) return "cod_payment";
  if (/warranty|guarantee/.test(text)) return "warranty";
  if (/stock|available|reserve|ada|self pickup/.test(text)) return "stock_check";
  return "buyer_message";
}

function urgencyForBuyerProblem(problemType: string): BuyerReplyDraft["urgency"] {
  if (["refund_request", "exchange_request", "defective_product", "wrong_item"].includes(problemType)) return "high";
  if (["shipping_delay", "address_change", "cod_payment"].includes(problemType)) return "medium";
  return "low";
}

function fallbackBuyerReply(message: BuyerReplyDraftInput["messages"][number], problemType: string): string {
  const product = message.productName ? ` for ${message.productName}` : "";
  switch (problemType) {
    case "defective_product":
      return `Hi ${message.buyerName}, sorry the item${product} arrived with an issue. Please send your order ID plus a short photo/video of the defect so we can check exchange or warranty options for you.`;
    case "wrong_item":
      return `Hi ${message.buyerName}, sorry you received the wrong item. Please share your order ID and a photo of what arrived, then we will guide you on the fastest exchange next step.`;
    case "refund_request":
      return `Hi ${message.buyerName}, sorry for the trouble. Please send your order ID and a photo/video of the issue. We will review the case and advise the correct refund or return process.`;
    case "exchange_request":
      return `Hi ${message.buyerName}, we can help check exchange eligibility. Please send your order ID, the item condition, and the variant you need so we can confirm the next step.`;
    case "shipping_delay":
      return `Hi ${message.buyerName}, sorry for the delay. Please send your order ID or tracking number and we will check the courier status and update you as soon as possible.`;
    case "address_change":
      return `Hi ${message.buyerName}, please send the new address and order ID. If the parcel has not shipped yet, we will try to update it before handover to courier.`;
    case "cod_payment":
      return `Hi ${message.buyerName}, thanks for checking. Please share your area and item, and we will confirm the COD/payment status for your order.`;
    case "warranty":
      return `Hi ${message.buyerName}, warranty coverage depends on the item and issue. Please share the product name and order ID and we will confirm the warranty details.`;
    case "stock_check":
      return `Hi ${message.buyerName}, thanks for messaging. Please tell us which variant you want and when you need it, then we will confirm stock availability for you.`;
    default:
      return `Hi ${message.buyerName}, thanks for messaging. Please share your order ID or product details so we can help you faster.`;
  }
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringArrayOr(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  return strings.length > 0 ? strings : fallback;
}

function confidenceOr(value: unknown, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function riskLevelOr(value: unknown, fallback: ProposedAction["riskLevel"]): ProposedAction["riskLevel"] {
  return value === "safe" || value === "medium" || value === "high" || value === "critical" ? value : fallback;
}

function urgencyOr(value: unknown, fallback: BuyerReplyDraft["urgency"]): BuyerReplyDraft["urgency"] {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

function objectOr(value: unknown, fallback: Record<string, unknown>): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : fallback;
}

function metricRecordOr(value: unknown, fallback: Record<string, string | number>): Record<string, string | number> {
  const object = objectOr(value, fallback);
  return Object.fromEntries(Object.entries(object).filter((entry): entry is [string, string | number] => typeof entry[1] === "string" || typeof entry[1] === "number"));
}
