import type { VerificationResult } from "@sea-ops/schemas";
import { StatusBadge } from "./Badges";

export function VerificationPanel({ verification, onVerify }: { verification?: VerificationResult; onVerify: () => void }) {
  return (
    <section className="panel">
      <div className="cardHeader">
        <h2>Verification</h2>
        <button className="button" onClick={onVerify}>Verify Outcome</button>
      </div>
      {verification ? (
        <div className="list">
          <StatusBadge status={verification.status} />
          <p>{verification.notes}</p>
          <pre>{JSON.stringify({ before: verification.metricBefore, after: verification.metricAfter }, null, 2)}</pre>
        </div>
      ) : (
        <p className="muted">Run verification after safe actions or approved simulations execute.</p>
      )}
    </section>
  );
}
