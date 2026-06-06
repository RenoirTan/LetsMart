import { OpsDiagnosisAgent, RiskClassificationAgent, VerificationAgent } from "@sea-ops/agents";
import { demoData } from "@sea-ops/mock-data";
import type { ActionType, ApprovalDecision, DemoStateSnapshot, Issue, MerchantFeedback, ProposedAction, RiskLevel, ToolExecutionLog } from "@sea-ops/schemas";
import { executeSimulatedTool } from "@sea-ops/tools";
import { demoWorkers } from "@sea-ops/workers";

export const riskPolicy = {
  safe: ["summarize_issue", "tag_order", "create_internal_task", "draft_buyer_reply", "draft_supplier_email", "classify_message", "flag_stockout", "generate_report"],
  medium: ["send_buyer_message", "update_order_status", "contact_supplier", "pause_fulfilment", "update_listing_text", "send_bulk_customer_update"],
  high: ["issue_refund", "cancel_order", "change_price", "reorder_inventory", "change_ad_budget", "pause_ad_campaign", "modify_listing_availability"],
  critical: ["legal_decision", "fraud_accusation", "account_security_change", "large_financial_commitment", "permanent_data_deletion"],
} as const;

export interface ApprovalQueueItem {
  action: ProposedAction;
  issue: Pick<Issue, "id" | "title" | "severity" | "channel" | "productName" | "affectedSku">;
}

interface DemoState {
  issues: Issue[];
  toolLogs: ToolExecutionLog[];
  feedback: MerchantFeedback[];
  approvals: ApprovalDecision[];
  lastScanAt?: string;
}

const state: DemoState = {
  issues: [],
  toolLogs: [],
  feedback: [],
  approvals: [],
};

export function resetDemo(): DemoStateSnapshot {
  state.issues = [];
  state.toolLogs = [];
  state.feedback = [];
  state.approvals = [];
  state.lastScanAt = undefined;
  return snapshot();
}

export async function runAgentScan(): Promise<DemoStateSnapshot> {
  const workerOutputs = await Promise.all(demoWorkers.map((worker) => worker.observe(demoData)));
  const events = workerOutputs.flat();
  const diagnosisAgent = new OpsDiagnosisAgent();
  const riskAgent = new RiskClassificationAgent();

  const issues = await diagnosisAgent.run(events);
  const enrichedIssues: Issue[] = [];

  for (const issue of issues) {
    const proposedActions = await riskAgent.run(issue);
    const enforcedActions = proposedActions.map(enforceRiskPolicy);
    const enforcedIssue: Issue = {
      ...issue,
      proposedActions: enforcedActions,
      status: enforcedActions.some((action) => action.status === "pending_approval") ? "awaiting_approval" : "executed",
      updatedAt: new Date().toISOString(),
    };

    for (const action of enforcedActions) {
      if (action.status === "auto_executed") {
        state.toolLogs.push(executeSimulatedTool(action));
      }
    }

    enrichedIssues.push(enforcedIssue);
  }

  state.issues = enrichedIssues;
  state.lastScanAt = new Date().toISOString();
  return snapshot();
}

export function getIssues(): Issue[] {
  return state.issues;
}

export function getIssue(id: string): Issue | undefined {
  return state.issues.find((issue) => issue.id === id);
}

export function getIssueDetail(id: string) {
  const issue = getIssue(id);
  if (!issue) return undefined;

  const actionIds = new Set(issue.proposedActions.map((action) => action.id));
  return {
    issue,
    toolLogs: state.toolLogs.filter((log) => actionIds.has(log.actionId)),
    feedback: state.feedback.filter((item) => item.issueId === id),
  };
}

export function getApprovals(): ApprovalQueueItem[] {
  return state.issues.flatMap((issue) =>
    issue.proposedActions
      .filter((action) => action.status === "pending_approval" || action.status === "approved")
      .map((action) => ({
        action,
        issue: {
          id: issue.id,
          title: issue.title,
          severity: issue.severity,
          channel: issue.channel,
          productName: issue.productName,
          affectedSku: issue.affectedSku,
        },
      })),
  );
}

export function approveAction(actionId: string, editedPayload?: Record<string, unknown>, merchantNote?: string): ProposedAction | undefined {
  const found = findAction(actionId);
  if (!found) return undefined;

  found.action.status = "approved";
  if (editedPayload) found.action.payload = { ...found.action.payload, ...editedPayload };
  found.issue.updatedAt = new Date().toISOString();
  state.approvals.push({ actionId, decision: editedPayload ? "edited" : "approved", editedPayload, merchantNote, decidedAt: new Date().toISOString() });
  return found.action;
}

export function rejectAction(actionId: string, merchantNote?: string): ProposedAction | undefined {
  const found = findAction(actionId);
  if (!found) return undefined;

  found.action.status = "rejected";
  found.issue.updatedAt = new Date().toISOString();
  refreshIssueStatus(found.issue);
  state.approvals.push({ actionId, decision: "rejected", merchantNote, decidedAt: new Date().toISOString() });
  return found.action;
}

export function executeAction(actionId: string): ToolExecutionLog | undefined {
  const found = findAction(actionId);
  if (!found || found.action.status !== "approved") return undefined;

  const log = executeSimulatedTool(found.action);
  state.toolLogs.push(log);
  found.action.status = "executed";
  found.issue.updatedAt = new Date().toISOString();
  refreshIssueStatus(found.issue);
  return log;
}

export async function verifyIssue(issueId: string) {
  const issue = getIssue(issueId);
  if (!issue) return undefined;

  issue.status = "verifying";
  const verification = await new VerificationAgent().run(issue);
  issue.verification = verification;
  issue.status = verification.status === "improved" ? "resolved" : verification.status === "needs_more_time" ? "needs_follow_up" : "needs_follow_up";
  issue.updatedAt = new Date().toISOString();
  return verification;
}

export function addFeedback(issueId: string, feedback: Omit<MerchantFeedback, "issueId" | "createdAt">): MerchantFeedback | undefined {
  if (!getIssue(issueId)) return undefined;
  const item: MerchantFeedback = { issueId, ...feedback, createdAt: new Date().toISOString() };
  state.feedback.push(item);
  return item;
}

export function getDailyReport() {
  const issues = state.issues;
  return {
    generatedAt: new Date().toISOString(),
    headline: "SEA ops scan found fragmented marketplace exceptions requiring action.",
    issueCount: issues.length,
    awaitingApproval: getApprovals().length,
    resolved: issues.filter((issue) => issue.status === "resolved").length,
    topRisks: issues.filter((issue) => issue.severity === "high").map((issue) => issue.title),
    safeActionsExecuted: state.toolLogs.length,
  };
}

export function snapshot(): DemoStateSnapshot {
  return {
    issues: state.issues,
    toolLogs: state.toolLogs,
    feedback: state.feedback,
    lastScanAt: state.lastScanAt,
  };
}

function enforceRiskPolicy(action: ProposedAction): ProposedAction {
  const verifiedRisk = classifyActionRisk(action.actionType);
  if (verifiedRisk === "critical") {
    return { ...action, riskLevel: "critical", requiresApproval: true, status: "rejected" };
  }
  if (verifiedRisk === "safe") {
    return { ...action, riskLevel: "safe", requiresApproval: false, status: "auto_executed" };
  }
  return { ...action, riskLevel: verifiedRisk, requiresApproval: true, status: "pending_approval" };
}

function classifyActionRisk(actionType: ActionType): RiskLevel {
  if ((riskPolicy.safe as readonly string[]).includes(actionType)) return "safe";
  if ((riskPolicy.medium as readonly string[]).includes(actionType)) return "medium";
  if ((riskPolicy.high as readonly string[]).includes(actionType)) return "high";
  return "critical";
}

function findAction(actionId: string): { issue: Issue; action: ProposedAction } | undefined {
  for (const issue of state.issues) {
    const action = issue.proposedActions.find((candidate) => candidate.id === actionId);
    if (action) return { issue, action };
  }
  return undefined;
}

function refreshIssueStatus(issue: Issue) {
  if (issue.proposedActions.some((action) => action.status === "pending_approval" || action.status === "approved")) {
    issue.status = "awaiting_approval";
    return;
  }

  if (issue.proposedActions.some((action) => action.status === "executed" || action.status === "auto_executed")) {
    issue.status = "executed";
  }
}
