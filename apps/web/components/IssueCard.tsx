import type { Issue } from "@sea-ops/schemas";
import Link from "next/link";
import { ChannelBadge, RiskBadge, SeverityBadge, StatusBadge } from "./Badges";

export function IssueCard({ issue }: { issue: Issue }) {
  const highestRisk = issue.proposedActions.find((action) => action.riskLevel === "high")?.riskLevel ?? issue.proposedActions.find((action) => action.riskLevel === "medium")?.riskLevel ?? "safe";

  return (
    <Link className="card" href={`/issues/${issue.id}`}>
      <div className="cardHeader">
        <div>
          <h3>{issue.title}</h3>
          <p>{issue.summary}</p>
        </div>
        <RiskBadge risk={highestRisk} />
      </div>
      <div className="badgeRow">
        <ChannelBadge channel={issue.channel} />
        <SeverityBadge severity={issue.severity} />
        <StatusBadge status={issue.status} />
      </div>
      <div className="muted">
        {issue.productName ?? "Marketplace issue"} {issue.affectedSku ? `(${issue.affectedSku})` : ""}
      </div>
      <div className="muted">
        {issue.events[0]?.evidence.length ?? 0} evidence records · {issue.proposedActions.length} proposed actions
      </div>
    </Link>
  );
}
