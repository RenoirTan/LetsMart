"use client";

import type { ProposedAction } from "@sea-ops/schemas";
import { RiskBadge, StatusBadge } from "./Badges";

export function ApprovalPanel({
  actions,
  onApprove,
  onReject,
  onExecute,
}: {
  actions: ProposedAction[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onExecute: (id: string) => void;
}) {
  return (
    <section className="panel">
      <h2>Actions & Approval</h2>
      <p className="muted">Safe actions auto-run. Medium and high risk actions wait for merchant control.</p>
      <div className="list">
        {actions.map((action) => (
          <div className="actionItem" key={action.id}>
            <div className="cardHeader">
              <div>
                <strong>{action.title}</strong>
                <p className="muted">{action.description}</p>
              </div>
              <RiskBadge risk={action.riskLevel} />
            </div>
            <p>{action.expectedOutcome}</p>
            <div className="actionFooter">
              <StatusBadge status={action.status} />
              <div className="actions">
                {action.status === "pending_approval" ? <button className="button primary" onClick={() => onApprove(action.id)}>Approve</button> : null}
                {action.status === "pending_approval" ? <button className="button danger" onClick={() => onReject(action.id)}>Reject</button> : null}
                {action.status === "approved" ? <button className="button" onClick={() => onExecute(action.id)}>Execute Simulation</button> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
