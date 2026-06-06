"use client";

import type { Issue } from "@sea-ops/schemas";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { IssueCard } from "./IssueCard";

const expectedScanIssues = [
  "Stockout risk",
  "Wrong SKU complaints",
  "Late delivery spike",
  "Ad waste",
  "Message backlog",
];

export function Dashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    api.getIssues().then(setIssues).finally(() => setLoading(false));
  }, []);

  async function runScan() {
    setBusy(true);
    setScanning(true);
    setIssues([]);
    try {
      const snapshot = await api.runScan();
      setIssues(snapshot.issues);
    } finally {
      setScanning(false);
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    setScanning(false);
    try {
      const snapshot = await api.reset();
      setIssues(snapshot.issues);
    } finally {
      setBusy(false);
    }
  }

  const awaiting = issues.filter((issue) => issue.status === "awaiting_approval").length;
  const high = issues.filter((issue) => issue.severity === "high").length;
  const safeExecuted = issues.flatMap((issue) => issue.proposedActions).filter((action) => action.status === "auto_executed").length;

  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">SEA Marketplace Operations</div>
          <h1>Exception command center, not a chatbot.</h1>
          <p>Run one scan to detect stockout risk, wrong-SKU complaints, courier delays, ad waste, and unanswered buyer messages across fragmented SEA commerce channels.</p>
        </div>
        <div className="actions">
          <button className="button primary" onClick={runScan} disabled={busy}>{scanning ? "Scanning..." : "Run Agent Scan"}</button>
          <button className="button" onClick={reset} disabled={busy}>Reset Demo</button>
        </div>
      </section>

      <section className="stats">
        <div className="stat"><strong>{issues.length}</strong><span>Detected issues</span></div>
        <div className="stat"><strong>{awaiting}</strong><span>Awaiting approval</span></div>
        <div className="stat"><strong>{high}</strong><span>High severity</span></div>
        <div className="stat"><strong>{safeExecuted}</strong><span>Safe actions auto-run</span></div>
      </section>

      {loading ? <div className="empty">Loading demo state...</div> : null}
      {!loading && !scanning && issues.length === 0 ? (
        <div className="empty">
          <h2>No scan results yet</h2>
          <p>Click Run Agent Scan to generate the five demo marketplace exceptions from mock SEA operations data.</p>
        </div>
      ) : null}
      <section className="grid">
        {scanning
          ? expectedScanIssues.map((title) => (
              <div className="card loadingCard" key={title}>
                <div className="cardHeader">
                  <div>
                    <h3>{title}</h3>
                    <p>Agent is observing signals, diagnosing evidence, and applying risk guardrails...</p>
                  </div>
                  <div className="spinner" aria-label="Loading issue" />
                </div>
              </div>
            ))
          : issues.map((issue) => <IssueCard issue={issue} key={issue.id} />)}
      </section>
    </>
  );
}
