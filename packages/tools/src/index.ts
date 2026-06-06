import type { ProposedAction, ToolExecutionLog } from "@sea-ops/schemas";

const id = () => globalThis.crypto?.randomUUID?.() ?? `log-${Date.now()}-${Math.random()}`;

type ToolResult = Record<string, unknown>;

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

export function executeSimulatedTool(action: ProposedAction): ToolExecutionLog {
  const toolName = toolForAction(action.actionType);
  const output = runTool(toolName, action.payload);

  return {
    id: id(),
    actionId: action.id,
    toolName,
    input: action.payload,
    output,
    simulated: true,
    executedAt: new Date().toISOString(),
  };
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
