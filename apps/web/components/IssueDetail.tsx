"use client";

import type { IssueDetailResponse, MerchantFeedback } from "@sea-ops/schemas";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ApprovalPanel } from "./ApprovalPanel";
import { ChannelBadge, SeverityBadge, StatusBadge } from "./Badges";
import { ReasoningTimeline } from "./ReasoningTimeline";
import { ToolLogPanel } from "./ToolLogPanel";
import { VerificationPanel } from "./VerificationPanel";

export function IssueDetail() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<IssueDetailResponse>();
  const [missing, setMissing] = useState(false);
  const [rating, setRating] = useState<MerchantFeedback["rating"]>("helpful");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      setMissing(false);
      setDetail(await api.getIssue(params.id));
    } catch {
      setDetail(undefined);
      setMissing(true);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (missing) {
    return (
      <div className="empty">
        <h2>Issue no longer exists in demo state</h2>
        <p>The dev server may have reloaded and cleared in-memory backend state. Go back to the dashboard and run the agent scan again.</p>
        <Link className="button primary" href="/">Back to dashboard</Link>
      </div>
    );
  }

  if (!detail) return <div className="empty">Loading issue...</div>;

  const { issue, toolLogs, feedback } = detail;

  async function approve(id: string) {
    await api.approveAction(id, "Approved from issue detail.");
    await load();
  }

  async function reject(id: string) {
    await api.rejectAction(id, "Rejected from issue detail.");
    await load();
  }

  async function execute(id: string) {
    await api.executeAction(id);
    await load();
  }

  async function verify() {
    await api.verifyIssue(issue.id);
    await load();
  }

  async function submitFeedback() {
    await api.sendFeedback(issue.id, { rating, note });
    setNote("");
    await load();
  }

  return (
    <>
      <section className="hero">
        <div>
          <Link className="muted" href="/">← Back to issues</Link>
          <div className="eyebrow">Issue Diagnosis</div>
          <h1>{issue.title}</h1>
          <p>{issue.summary}</p>
          <div className="badgeRow" style={{ marginTop: 14 }}>
            <ChannelBadge channel={issue.channel} />
            <SeverityBadge severity={issue.severity} />
            <StatusBadge status={issue.status} />
          </div>
        </div>
      </section>

      <div className="split">
        <div>
          <section className="panel">
            <h2>Evidence</h2>
            <div className="list">
              {issue.events.flatMap((event) => event.evidence).map((evidence) => (
                <div className="evidence" key={`${evidence.source}-${evidence.recordId}`}>
                  <strong>{evidence.source} · {evidence.recordId}</strong>
                  <p>{evidence.note}</p>
                  <p className="muted">{evidence.field}: {String(evidence.value)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Reasoning Timeline</h2>
            <p className="muted">Root cause: {issue.diagnosis?.rootCauseHypothesis}</p>
            <ReasoningTimeline steps={issue.diagnosis?.reasoningSteps ?? []} />
          </section>

          <ToolLogPanel logs={toolLogs} />
        </div>

        <div>
          <ApprovalPanel actions={issue.proposedActions} onApprove={approve} onReject={reject} onExecute={execute} />
          <VerificationPanel verification={issue.verification} onVerify={verify} />
          <section className="panel">
            <h2>Merchant Feedback</h2>
            <div className="list">
              <select value={rating} onChange={(event) => setRating(event.target.value as MerchantFeedback["rating"])}>
                <option value="helpful">Helpful</option>
                <option value="not_helpful">Not helpful</option>
                <option value="too_aggressive">Too aggressive</option>
                <option value="too_conservative">Too conservative</option>
              </select>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What should the agent learn for next time?" />
              <button className="button primary" onClick={submitFeedback}>Submit Feedback</button>
            </div>
            {feedback.length ? <p className="muted">{feedback.length} feedback item(s) saved.</p> : null}
          </section>
        </div>
      </div>
    </>
  );
}
