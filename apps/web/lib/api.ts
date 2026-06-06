import type { DemoStateSnapshot, Issue, IssueDetailResponse, MerchantFeedback, ProposedAction, ToolExecutionLog, VerificationResult } from "@sea-ops/schemas";

export interface ApprovalQueueItem {
  action: ProposedAction;
  issue: Pick<Issue, "id" | "title" | "severity" | "channel" | "productName" | "affectedSku">;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export const api = {
  getIssues: () => request<Issue[]>("/api/issues"),
  getIssue: (id: string) => request<IssueDetailResponse>(`/api/issues/${id}`),
  getApprovals: () => request<ApprovalQueueItem[]>("/api/approvals"),
  runScan: () => request<DemoStateSnapshot>("/api/agent/run", { method: "POST" }),
  reset: () => request<DemoStateSnapshot>("/api/demo/reset"),
  approveAction: (id: string, merchantNote?: string) => request<ProposedAction>(`/api/actions/${id}/approve`, { method: "POST", body: JSON.stringify({ merchantNote }) }),
  rejectAction: (id: string, merchantNote?: string) => request<ProposedAction>(`/api/actions/${id}/reject`, { method: "POST", body: JSON.stringify({ merchantNote }) }),
  executeAction: (id: string) => request<ToolExecutionLog>(`/api/actions/${id}/execute`, { method: "POST" }),
  verifyIssue: (id: string) => request<VerificationResult>(`/api/issues/${id}/verify`, { method: "POST" }),
  sendFeedback: (id: string, payload: Omit<MerchantFeedback, "issueId" | "createdAt">) => request<MerchantFeedback>(`/api/issues/${id}/feedback`, { method: "POST", body: JSON.stringify(payload) }),
};
