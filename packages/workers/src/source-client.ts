import type { HealthResponse, SimulatedActionRequest, SimulatedActionResult, SnapshotResponse, SourceEvent } from "@sea-ops/schemas";

export class SimulatedSourceClient {
  async getHealth(serverUrl: string): Promise<HealthResponse> {
    return this.getJson<HealthResponse>(`${serverUrl}/health`);
  }

  async getSnapshot(serverUrl: string): Promise<SnapshotResponse> {
    return this.getJson<SnapshotResponse>(`${serverUrl}/snapshot`);
  }

  async getEvents(serverUrl: string, sinceVersion?: number): Promise<SourceEvent[]> {
    const url = new URL(`${serverUrl}/events`);
    if (sinceVersion !== undefined) {
      url.searchParams.set("sinceVersion", String(sinceVersion));
    }

    return this.getJson<SourceEvent[]>(url.toString());
  }

  async applyAction(serverUrl: string, action: SimulatedActionRequest): Promise<SimulatedActionResult> {
    const response = await fetch(`${serverUrl}/apply-action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(action),
    });

    const body = await response.json() as SimulatedActionResult;
    if (!response.ok) {
      throw new Error(body.mutationSummary || `Failed to apply action to ${serverUrl}`);
    }

    return body;
  }

  private async getJson<T>(url: string): Promise<T> {
    const response = await fetch(url, { signal: AbortSignal.timeout(1200) });
    if (!response.ok) {
      throw new Error(`GET ${url} failed with ${response.status}`);
    }

    return await response.json() as T;
  }
}
