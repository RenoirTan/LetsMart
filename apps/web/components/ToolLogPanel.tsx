import type { ToolExecutionLog } from "@sea-ops/schemas";

export function ToolLogPanel({ logs }: { logs: ToolExecutionLog[] }) {
  return (
    <section className="panel">
      <h2>Simulated Tool Logs</h2>
      <p className="muted">Every execution is simulated and scoped to demo state.</p>
      {logs.length === 0 ? <p className="muted">No tool executions yet.</p> : null}
      <div className="list">
        {logs.map((log) => (
          <div className="evidence" key={log.id}>
            <strong>{log.toolName}</strong>
            <span className="muted">{new Date(log.executedAt).toLocaleString()}</span>
            <pre>{JSON.stringify({ input: log.input, output: log.output }, null, 2)}</pre>
          </div>
        ))}
      </div>
    </section>
  );
}
