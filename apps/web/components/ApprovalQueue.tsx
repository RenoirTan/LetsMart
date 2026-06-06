"use client";

import { useEffect, useState } from "react";
import { api, type ApprovalQueueItem } from "@/lib/api";
import { ChannelBadge, RiskBadge, SeverityBadge, StatusBadge } from "./Badges";

export function ApprovalQueue() {
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [busyId, setBusyId] = useState<string>();

  async function load() {
    setItems(await api.getApprovals());
  }

  useEffect(() => {
    load();
  }, []);

  async function approveAndExecute(id: string) {
    setBusyId(id);
    try {
      await api.approveAction(id, "Approved in demo queue.");
      await api.executeAction(id);
      await load();
    } finally {
      setBusyId(undefined);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    try {
      await api.rejectAction(id, "Rejected in demo queue.");
      await load();
    } finally {
      setBusyId(undefined);
    }
  }

  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">Trust-Governed Automation</div>
          <h1>Approval queue</h1>
          <p>Risky marketplace actions are held for merchant control. This preserves trust while still letting the agent execute safe operational work automatically.</p>
        </div>
      </section>

      {items.length === 0 ? <div className="empty">No pending approvals. Run a scan from the dashboard first.</div> : null}
      <div className="list">
        {items.map(({ action, issue }) => (
          <section className="panel" key={action.id}>
            <div className="cardHeader">
              <div>
                <h2>{action.title}</h2>
                <p className="muted">{issue.title}</p>
              </div>
              <RiskBadge risk={action.riskLevel} />
            </div>
            <p>{action.description}</p>
            <div className="badgeRow">
              <ChannelBadge channel={issue.channel} />
              <SeverityBadge severity={issue.severity} />
              <StatusBadge status={action.status} />
            </div>
            <pre>{JSON.stringify(action.payload, null, 2)}</pre>
            <div className="actions">
              <button className="button primary" disabled={busyId === action.id} onClick={() => approveAndExecute(action.id)}>Approve + Execute</button>
              <button className="button danger" disabled={busyId === action.id} onClick={() => reject(action.id)}>Reject</button>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
