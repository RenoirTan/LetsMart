import { z } from "zod";

export const channelSchema = z.enum([
  "shopee",
  "lazada",
  "tiktok_shop",
  "whatsapp",
  "instagram_dm",
  "google_sheets",
  "supplier_email",
  "courier",
  "ads",
]);

export const riskLevelSchema = z.enum(["safe", "medium", "high", "critical"]);

export const issueTypeSchema = z.enum([
  "stockout_risk",
  "wrong_sku_complaint",
  "late_delivery_spike",
  "ad_waste",
  "message_backlog",
  "price_change",
  "competitor_action",
  "supplier_delay",
  "listing_health",
  "trend_signal",
]);

export const issueStatusSchema = z.enum([
  "detected",
  "diagnosed",
  "awaiting_approval",
  "executed",
  "verifying",
  "resolved",
  "needs_follow_up",
]);

export const severitySchema = z.enum(["low", "medium", "high"]);

export const actionTypeSchema = z.enum([
  "summarize_issue",
  "tag_order",
  "create_internal_task",
  "draft_buyer_reply",
  "draft_supplier_email",
  "classify_message",
  "flag_stockout",
  "send_buyer_message",
  "update_order_status",
  "contact_supplier",
  "pause_fulfilment",
  "update_listing_text",
  "send_bulk_customer_update",
  "issue_refund",
  "cancel_order",
  "change_price",
  "reorder_inventory",
  "change_ad_budget",
  "pause_ad_campaign",
  "modify_listing_availability",
]);

export type Channel = z.infer<typeof channelSchema>;
export type RiskLevel = z.infer<typeof riskLevelSchema>;
export type IssueType = z.infer<typeof issueTypeSchema>;
export type IssueStatus = z.infer<typeof issueStatusSchema>;
export type Severity = z.infer<typeof severitySchema>;
export type ActionType = z.infer<typeof actionTypeSchema>;

export const evidenceSchema = z.object({
  source: z.string(),
  recordId: z.string(),
  field: z.string().optional(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  note: z.string(),
});

export type Evidence = z.infer<typeof evidenceSchema>;

export const marketplaceEventSchema = z.object({
  id: z.string(),
  type: issueTypeSchema,
  sourceWorker: z.string(),
  channel: channelSchema,
  entityId: z.string().optional(),
  sku: z.string().optional(),
  productName: z.string().optional(),
  severity: severitySchema,
  detectedAt: z.string(),
  evidence: z.array(evidenceSchema),
  metrics: z.record(z.union([z.number(), z.string(), z.boolean()])),
});

export type MarketplaceEvent = z.infer<typeof marketplaceEventSchema>;

export type PrimitiveValue = string | number | boolean;

export type MockRecord = {
  id: string;
  [key: string]: unknown;
};

export type SourceType =
  | "inventory"
  | "sku_mapping"
  | "courier"
  | "ads"
  | "messages"
  | "competitor"
  | "trend"
  | "supplier";

export type SourceEvidence = {
  collection: string;
  recordId: string;
  label: string;
  value: PrimitiveValue;
};

export type SourceEvent = {
  id: string;
  serverId: string;
  sourceType: SourceType;
  issueType: IssueType;
  severity: Severity;
  productName?: string;
  sku?: string;
  metrics: Record<string, PrimitiveValue>;
  evidence: SourceEvidence[];
  version: number;
  createdAt: string;
};

export type SimulatedServerState = {
  serverId: string;
  version: number;
  collections: Record<string, MockRecord[]>;
  events: SourceEvent[];
  actionLogs: SimulatedActionResult[];
  lastUpdatedAt: string;
};

export type HealthResponse = {
  ok: true;
  serverId: string;
  displayName: string;
  version: number;
  lastUpdatedAt: string;
};

export type SnapshotResponse = {
  serverId: string;
  version: number;
  collections: Record<string, MockRecord[]>;
  lastUpdatedAt: string;
};

export type SimulatedActionRequest = {
  actionId: string;
  issueId: string;
  actionType: string;
  approvedBy: string;
  payload: Record<string, unknown>;
};

export type SimulatedActionResult = {
  actionId: string;
  accepted: boolean;
  mutationSummary: string;
  stateBefore: Record<string, unknown>;
  stateAfter: Record<string, unknown>;
  version: number;
  appliedAt: string;
};

export type TriggerRequest = {
  scenario?: string;
  payload?: Record<string, unknown>;
};

export type TriggerResult = {
  accepted: boolean;
  mutationSummary: string;
  version: number;
  triggeredAt: string;
};

export type CollectionSummary = {
  name: string;
  count: number;
};

export const diagnosisSchema = z.object({
  rootCauseHypothesis: z.string(),
  confidence: z.number().min(0).max(1),
  reasoningSteps: z.array(z.string()),
  supportingEvidenceIds: z.array(z.string()),
});

export type Diagnosis = z.infer<typeof diagnosisSchema>;

export const proposedActionSchema = z.object({
  id: z.string(),
  issueId: z.string(),
  actionType: actionTypeSchema,
  title: z.string(),
  description: z.string(),
  riskLevel: riskLevelSchema,
  requiresApproval: z.boolean(),
  payload: z.record(z.unknown()),
  expectedOutcome: z.string(),
  status: z.enum([
    "drafted",
    "auto_executed",
    "pending_approval",
    "approved",
    "rejected",
    "executed",
  ]),
});

export type ProposedAction = z.infer<typeof proposedActionSchema>;

export const verificationResultSchema = z.object({
  issueId: z.string(),
  status: z.enum(["improved", "unchanged", "worse", "needs_more_time"]),
  metricBefore: z.record(z.union([z.number(), z.string()])),
  metricAfter: z.record(z.union([z.number(), z.string()])),
  notes: z.string(),
  verifiedAt: z.string(),
});

export type VerificationResult = z.infer<typeof verificationResultSchema>;

export const issueSchema = z.object({
  id: z.string(),
  type: issueTypeSchema,
  title: z.string(),
  summary: z.string(),
  status: issueStatusSchema,
  channel: channelSchema,
  affectedSku: z.string().optional(),
  productName: z.string().optional(),
  severity: severitySchema,
  events: z.array(marketplaceEventSchema),
  diagnosis: diagnosisSchema.optional(),
  proposedActions: z.array(proposedActionSchema),
  verification: verificationResultSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Issue = z.infer<typeof issueSchema>;

export const approvalDecisionSchema = z.object({
  actionId: z.string(),
  decision: z.enum(["approved", "rejected", "edited"]),
  editedPayload: z.record(z.unknown()).optional(),
  merchantNote: z.string().optional(),
  decidedAt: z.string(),
});

export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;

export const toolExecutionLogSchema = z.object({
  id: z.string(),
  actionId: z.string(),
  toolName: z.string(),
  input: z.record(z.unknown()),
  output: z.record(z.unknown()),
  simulated: z.literal(true),
  executedAt: z.string(),
});

export type ToolExecutionLog = z.infer<typeof toolExecutionLogSchema>;

export const merchantFeedbackSchema = z.object({
  issueId: z.string(),
  rating: z.enum(["helpful", "not_helpful", "too_aggressive", "too_conservative"]),
  note: z.string().optional(),
  futurePreference: z.string().optional(),
  createdAt: z.string(),
});

export type MerchantFeedback = z.infer<typeof merchantFeedbackSchema>;

export interface IssueDetailResponse {
  issue: Issue;
  toolLogs: ToolExecutionLog[];
  feedback: MerchantFeedback[];
}

export interface DemoStateSnapshot {
  issues: Issue[];
  toolLogs: ToolExecutionLog[];
  feedback: MerchantFeedback[];
  lastScanAt?: string;
}
