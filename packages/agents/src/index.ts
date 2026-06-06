import type { ActionType, Issue, IssueType, MarketplaceEvent, ProposedAction, VerificationResult } from "@sea-ops/schemas";

const id = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;

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
};

export class OpsDiagnosisAgent extends BaseAgent<MarketplaceEvent[], Issue[]> {
  readonly name = "OpsDiagnosisAgent";

  async run(events: MarketplaceEvent[]): Promise<Issue[]> {
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
}

export class RiskClassificationAgent extends BaseAgent<Issue, ProposedAction[]> {
  readonly name = "RiskClassificationAgent";

  async run(issue: Issue): Promise<ProposedAction[]> {
    return actionCatalog(issue).map((action) => ({
      id: `action-${issue.type}-${action.actionType}`,
      issueId: issue.id,
      status: "drafted",
      ...action,
    }));
  }
}

export class VerificationAgent extends BaseAgent<Issue, VerificationResult> {
  readonly name = "VerificationAgent";

  async run(issue: Issue): Promise<VerificationResult> {
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
    default:
      return [action("summarize_issue", "Summarize issue", "Summarize the detected marketplace issue.", "Merchant can review the issue.", commonSafe)];
  }
}

export const promptTemplates = {
  opsDiagnosis: "Return a JSON issue diagnosis with rootCauseHypothesis, confidence, reasoningSteps, and supportingEvidenceIds. Do not propose forbidden actions.",
  riskClassification: "Classify each proposed marketplace action as safe, medium, high, or critical. Explain why approval is required when risk is not safe.",
  verification: "Compare before and after operational metrics and return improved, unchanged, worse, or needs_more_time.",
};
