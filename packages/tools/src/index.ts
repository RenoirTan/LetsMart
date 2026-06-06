import { BuyerReplyDraftAgent } from "@sea-ops/agents";
import type { ProposedAction, SimulatedActionRequest, SimulatedActionResult, ToolExecutionLog } from "@sea-ops/schemas";

declare const process: { env?: Record<string, string | undefined> } | undefined;

const id = () => globalThis.crypto?.randomUUID?.() ?? `log-${Date.now()}-${Math.random()}`;

type ToolResult = Record<string, unknown>;

interface SimulatorApplyResult {
  requestPayload: Record<string, unknown>;
  response: SimulatedActionResult | { forwarded: false; reason: string };
}

export function createInternalTask(input: Record<string, unknown>): ToolResult {
  return { taskId: id(), queue: "ops-priority", status: "created", ...input };
}

export function tagOrder(input: Record<string, unknown>): ToolResult {
  return { tag: "agent-review", tagged: true, affectedOrders: input.affectedOrders ?? "matched-from-scenario" };
}

export function draftBuyerReply(input: Record<string, unknown>): ToolResult {
  return {
    draftId: id(),
    language: "mixed-en-ms-id",
    text: "Hi! Sorry for the issue. We are checking this order now and will update you with the fastest next step. Terima kasih for your patience.",
    ...input,
  };
}

export function draftSupplierEmail(input: Record<string, unknown>): ToolResult {
  return { draftId: id(), subject: "Urgent ETA confirmation needed", body: "Please confirm latest replenishment ETA and available quantity today.", ...input };
}

export function classifyCustomerMessage(input: Record<string, unknown>): ToolResult {
  return { classes: { stockCheck: 1, deliveryRequest: 2, complaint: 1, codQuestion: 1 }, confidence: 0.86, ...input };
}

export function sendBuyerMessageSimulation(input: Record<string, unknown>): ToolResult {
  return { simulatedSend: true, messageBatchId: id(), recipientCount: input.recipientCount ?? 5, ...input };
}

export function pauseFulfilmentSimulation(input: Record<string, unknown>): ToolResult {
  return { simulatedPause: true, scope: input.scope ?? "affected-orders", ...input };
}

export function recommendReorderSimulation(input: Record<string, unknown>): ToolResult {
  return { recommendationId: id(), recommendedQty: input.recommendedQty ?? 250, simulatedOnly: true, ...input };
}

export function recommendAdBudgetChangeSimulation(input: Record<string, unknown>): ToolResult {
  return { recommendationId: id(), recommendedDailyBudget: input.recommendedDailyBudget ?? 20, simulatedOnly: true, ...input };
}

export function verifyIssueOutcome(input: Record<string, unknown>): ToolResult {
  return { verificationQueued: true, checkedAt: new Date().toISOString(), ...input };
}

const simulatorServerUrls: Record<string, string> = {
  "shopee-inventory-server": "http://localhost:5101",
  "tiktok-sku-server": "http://localhost:5102",
  "courier-delay-server": "http://localhost:5103",
  "ads-waste-server": "http://localhost:5104",
  "whatsapp-backlog-server": "http://localhost:5105",
  "competitor-watch-server": "http://localhost:5106",
  "trend-watch-server": "http://localhost:5107",
  "supplier-delay-server": "http://localhost:5108",
};

const simulatorForwardableActions = new Set<ProposedAction["actionType"]>([
  "create_internal_task",
  "draft_buyer_reply",
  "draft_supplier_email",
  "send_buyer_message",
  "send_bulk_customer_update",
  "contact_supplier",
  "pause_fulfilment",
  "reorder_inventory",
  "change_ad_budget",
  "pause_ad_campaign",
  "change_price",
]);

const simulatorLogsEnabled = () => process?.env?.SIMULATOR_LOGS !== "0";

const logToolForwarder = (message: string) => {
  if (!simulatorLogsEnabled()) return;
  console.log(`[tool-forwarder] ${message}`);
};

export async function executeSimulatedTool(action: ProposedAction): Promise<ToolExecutionLog> {
  const toolName = toolForAction(action.actionType);
  const localOutput = runTool(toolName, action.payload);
  const simulatorResult = await applySimulatorAction(action);

  return {
    id: id(),
    actionId: action.id,
    toolName,
    input: action.payload,
    output: buildToolOutput(localOutput, simulatorResult),
    simulated: true,
    executedAt: new Date().toISOString(),
  };
}

function buildToolOutput(localOutput: ToolResult, simulatorResult: SimulatorApplyResult | undefined): ToolResult {
  if (!simulatorResult) return localOutput;

  const metadata = objectValue(simulatorResult.requestPayload.replyDraftMetadata);
  return {
    ...localOutput,
    agentUsed: metadata?.agentUsed,
    draftSource: metadata?.draftSource,
    model: metadata?.model,
    fallbackReason: metadata?.fallbackReason,
    replyDrafts: simulatorResult.requestPayload.replyDrafts,
    simulator: simulatorResult.response,
  };
}

async function applySimulatorAction(action: ProposedAction): Promise<SimulatorApplyResult | undefined> {
  if (!simulatorForwardableActions.has(action.actionType)) {
    logToolForwarder(`skip action=${action.actionType} actionId=${action.id} reason=not-forwardable`);
    return undefined;
  }

  const serverId = typeof action.payload.serverId === "string" ? action.payload.serverId : undefined;
  const serverUrl = serverId ? simulatorServerUrls[serverId] : undefined;
  if (!serverUrl) {
    logToolForwarder(`skip action=${action.actionType} actionId=${action.id} reason=no-server-id`);
    return undefined;
  }

  const payload = await enrichSimulatorPayload(action, serverUrl);
  const request: SimulatedActionRequest = {
    actionId: action.id,
    issueId: action.issueId,
    actionType: action.actionType,
    approvedBy: "demo-merchant",
    payload,
  };

  try {
    logToolForwarder(`POST ${serverUrl}/apply-action action=${action.actionType} actionId=${action.id} issueId=${action.issueId}`);
    const response = await fetch(`${serverUrl}/apply-action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(1500),
    });

    const body = await response.json() as SimulatedActionResult;
    if (!response.ok) {
      logToolForwarder(`rejected action=${action.actionType} actionId=${action.id} reason="${body.mutationSummary}"`);
      return { requestPayload: payload, response: { forwarded: false, reason: body.mutationSummary || `Simulator rejected ${action.actionType}` } };
    }

    logToolForwarder(`accepted action=${action.actionType} actionId=${action.id} version=${body.version} summary="${body.mutationSummary}"`);
    return { requestPayload: payload, response: body };
  } catch (error) {
    logToolForwarder(`failed action=${action.actionType} actionId=${action.id} error="${error instanceof Error ? error.message : "Simulator action failed"}"`);
    return { requestPayload: request.payload, response: { forwarded: false, reason: error instanceof Error ? error.message : "Simulator action failed" } };
  }
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function normalizeSimulatorPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    ...payload,
    campaignId: payload.campaignId ?? payload.entityId,
    quantity: payload.quantity ?? payload.recommendedQty,
    dailyBudget: payload.dailyBudget ?? payload.recommendedDailyBudget,
  };
}

async function enrichSimulatorPayload(action: ProposedAction, serverUrl: string): Promise<Record<string, unknown>> {
  const payload = normalizeSimulatorPayload(action.payload);
  if (action.actionType !== "draft_buyer_reply" || action.payload.serverId !== "whatsapp-backlog-server") {
    return payload;
  }

  try {
    const response = await fetch(`${serverUrl}/collections/messages`, { signal: AbortSignal.timeout(1500) });
    if (!response.ok) return payload;

    const messages = await response.json() as Array<Record<string, unknown>>;
    const replyResult = await new BuyerReplyDraftAgent().runWithMetadata({
      messages: messages
        .filter((message) => message.status === "unanswered")
        .map((message) => ({
          messageId: String(message.id),
          buyerName: String(message.buyerName ?? "Buyer"),
          body: String(message.body ?? ""),
          productName: typeof message.productName === "string" ? message.productName : undefined,
          status: typeof message.status === "string" ? message.status : undefined,
        })),
      context: payload,
    });

    return { ...payload, replyDrafts: replyResult.drafts, replyDraftMetadata: replyResult.metadata };
  } catch (error) {
    logToolForwarder(`draft enrichment failed actionId=${action.id} error="${error instanceof Error ? error.message : "Unknown error"}"`);
    return payload;
  }
}

function toolForAction(actionType: ProposedAction["actionType"]): string {
  return {
    summarize_issue: "createInternalTask",
    tag_order: "tagOrder",
    create_internal_task: "createInternalTask",
    draft_buyer_reply: "draftBuyerReply",
    draft_supplier_email: "draftSupplierEmail",
    classify_message: "classifyCustomerMessage",
    flag_stockout: "createInternalTask",
    send_buyer_message: "sendBuyerMessageSimulation",
    update_order_status: "createInternalTask",
    contact_supplier: "draftSupplierEmail",
    pause_fulfilment: "pauseFulfilmentSimulation",
    update_listing_text: "createInternalTask",
    send_bulk_customer_update: "sendBuyerMessageSimulation",
    issue_refund: "blockedCriticalAction",
    cancel_order: "blockedCriticalAction",
    change_price: "blockedCriticalAction",
    reorder_inventory: "recommendReorderSimulation",
    change_ad_budget: "recommendAdBudgetChangeSimulation",
    pause_ad_campaign: "recommendAdBudgetChangeSimulation",
    modify_listing_availability: "blockedCriticalAction",
  }[actionType];
}

function runTool(toolName: string, input: Record<string, unknown>): ToolResult {
  switch (toolName) {
    case "createInternalTask":
      return createInternalTask(input);
    case "tagOrder":
      return tagOrder(input);
    case "draftBuyerReply":
      return draftBuyerReply(input);
    case "draftSupplierEmail":
      return draftSupplierEmail(input);
    case "classifyCustomerMessage":
      return classifyCustomerMessage(input);
    case "sendBuyerMessageSimulation":
      return sendBuyerMessageSimulation(input);
    case "pauseFulfilmentSimulation":
      return pauseFulfilmentSimulation(input);
    case "recommendReorderSimulation":
      return recommendReorderSimulation(input);
    case "recommendAdBudgetChangeSimulation":
      return recommendAdBudgetChangeSimulation(input);
    case "verifyIssueOutcome":
      return verifyIssueOutcome(input);
    default:
      return { blocked: true, reason: "Tool not available in demo." };
  }
}
