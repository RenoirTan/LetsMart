import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type {
  CollectionSummary,
  MockRecord,
  SimulatedActionRequest,
  SimulatedActionResult,
  SimulatedServerState,
  SnapshotResponse,
  SourceEvent,
  TriggerRequest,
  TriggerResult,
} from "@sea-ops/schemas";

type MutableState = SimulatedServerState;

export type ActionHandler = (
  state: MutableState,
  request: SimulatedActionRequest,
) => { accepted: boolean; mutationSummary: string };

export type TriggerHandler = (
  state: MutableState,
  request: TriggerRequest,
) => { accepted: boolean; mutationSummary: string };

export type SimulatedServerConfig = {
  serverId: string;
  displayName: string;
  port: number;
  initialCollections: Record<string, MockRecord[]>;
  detectEvents: (state: SimulatedServerState) => SourceEvent[];
  trigger: TriggerHandler;
  actionHandlers: Record<string, ActionHandler>;
};

export type RunningSimulatedServer = {
  server: Server;
  config: SimulatedServerConfig;
  state: SimulatedServerState;
  close: () => Promise<void>;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const now = () => new Date().toISOString();
const logsEnabled = () => process.env.SIMULATOR_LOGS !== "0";

const log = (config: SimulatedServerConfig, message: string) => {
  if (!logsEnabled()) return;
  console.log(`[simulator:${config.serverId}] ${message}`);
};

const issueTypesFor = (events: SourceEvent[]): string => {
  const issueTypes = [...new Set(events.map((event) => event.issueType))];
  return issueTypes.length > 0 ? issueTypes.join(",") : "none";
};

const ensureCollection = (state: SimulatedServerState, collectionName: string): MockRecord[] => {
  state.collections[collectionName] ??= [];
  return state.collections[collectionName];
};

const createInitialState = (config: SimulatedServerConfig): SimulatedServerState => {
  const timestamp = now();
  const state: SimulatedServerState = {
    serverId: config.serverId,
    version: 1,
    collections: clone(config.initialCollections),
    events: [],
    actionLogs: [],
    lastUpdatedAt: timestamp,
  };

  state.events = config.detectEvents(state);
  return state;
};

const refreshEvents = (config: SimulatedServerConfig, state: SimulatedServerState) => {
  state.events = config.detectEvents(state);
};

const bumpVersion = (config: SimulatedServerConfig, state: SimulatedServerState) => {
  state.version += 1;
  state.lastUpdatedAt = now();
  refreshEvents(config, state);
};

const snapshot = (state: SimulatedServerState): SnapshotResponse => ({
  serverId: state.serverId,
  version: state.version,
  collections: state.collections,
  lastUpdatedAt: state.lastUpdatedAt,
});

const send = (response: ServerResponse, statusCode: number, body?: unknown, headers: Record<string, string> = {}) => {
  response.statusCode = statusCode;
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");

  Object.entries(headers).forEach(([key, value]) => response.setHeader(key, value));

  if (body === undefined) {
    response.end();
    return;
  }

  if (typeof body === "string") {
    response.end(body);
    return;
  }

  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body, null, 2));
};

const readBody = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) return {};

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};

  return JSON.parse(raw) as unknown;
};

const renderHtml = (config: SimulatedServerConfig, state: SimulatedServerState) => {
  const escapedState = JSON.stringify(state, null, 2)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${config.displayName}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; background: #f8fafc; color: #0f172a; }
      main { max-width: 1120px; margin: 0 auto; }
      header { display: flex; justify-content: space-between; gap: 16px; align-items: baseline; }
      code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .pill { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #e0f2fe; color: #075985; font-size: 12px; }
      pre { padding: 16px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; overflow: auto; }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>${config.displayName}</h1>
          <p class="pill">${config.serverId} · version ${state.version}</p>
        </div>
        <p>Use <code>/state</code>, <code>/events</code>, <code>/trigger</code>, and <code>/apply-action</code>.</p>
      </header>
      <pre>${escapedState}</pre>
    </main>
  </body>
</html>`;
};

const splitPath = (url: URL): string[] => url.pathname.split("/").filter(Boolean).map(decodeURIComponent);

const bodyAsRecord = (body: unknown): Record<string, unknown> => {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }

  return {};
};

export const createSimulatedServer = (config: SimulatedServerConfig): RunningSimulatedServer => {
  let state = createInitialState(config);

  const server = createServer(async (request, response) => {
    const startedAt = Date.now();
    const versionBefore = state.version;

    const finishLog = (detail = "") => {
      log(
        config,
        `${request.method ?? "UNKNOWN"} ${request.url ?? "/"} -> ${response.statusCode} version=${versionBefore}->${state.version} durationMs=${Date.now() - startedAt}${detail ? ` ${detail}` : ""}`,
      );
    };

    try {
      if (request.method === "OPTIONS") {
        send(response, 204);
        finishLog();
        return;
      }

      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
      const parts = splitPath(url);

      if (request.method === "GET" && parts.length === 0) {
        send(response, 200, renderHtml(config, state), { "content-type": "text/html; charset=utf-8" });
        finishLog();
        return;
      }

      if (request.method === "GET" && url.pathname === "/health") {
        send(response, 200, {
          ok: true,
          serverId: config.serverId,
          displayName: config.displayName,
          version: state.version,
          lastUpdatedAt: state.lastUpdatedAt,
        });
        finishLog();
        return;
      }

      if (request.method === "GET" && url.pathname === "/state") {
        send(response, 200, state);
        finishLog(`collections=${Object.keys(state.collections).length} actionLogs=${state.actionLogs.length}`);
        return;
      }

      if (request.method === "GET" && url.pathname === "/snapshot") {
        send(response, 200, snapshot(state));
        finishLog(`collections=${Object.keys(state.collections).length}`);
        return;
      }

      if (request.method === "GET" && url.pathname === "/events") {
        const sinceVersion = Number(url.searchParams.get("sinceVersion") ?? 0);
        const events = Number.isFinite(sinceVersion) && sinceVersion > 0
          ? state.events.filter((event) => event.version > sinceVersion)
          : state.events;
        send(response, 200, events);
        finishLog(`events=${events.length} issueTypes=${issueTypesFor(events)} sinceVersion=${Number.isFinite(sinceVersion) ? sinceVersion : "none"}`);
        return;
      }

      if (request.method === "GET" && url.pathname === "/collections") {
        const summaries: CollectionSummary[] = Object.entries(state.collections).map(([name, collection]) => ({
          name,
          count: collection.length,
        }));
        send(response, 200, summaries);
        finishLog(`collections=${summaries.map((summary) => `${summary.name}:${summary.count}`).join(",")}`);
        return;
      }

      if (parts[0] === "collections" && parts[1]) {
        const collectionName = parts[1];

        if (request.method === "GET" && parts.length === 2) {
          const collection = state.collections[collectionName];
          if (!collection) {
            send(response, 404, { error: "collection_not_found", collectionName });
            finishLog(`collection=${collectionName} error=collection_not_found`);
            return;
          }

          send(response, 200, collection);
          finishLog(`collection=${collectionName} records=${collection.length}`);
          return;
        }

        if (request.method === "POST" && parts.length === 2) {
          const collection = ensureCollection(state, collectionName);
          const payload = bodyAsRecord(await readBody(request));
          const record: MockRecord = {
            id: typeof payload.id === "string" ? payload.id : randomUUID(),
            ...payload,
          };

          collection.push(record);
          bumpVersion(config, state);
          send(response, 201, record);
          finishLog(`collection=${collectionName} recordId=${record.id} mutation=create`);
          return;
        }

        if (request.method === "PATCH" && parts.length === 3) {
          const collection = state.collections[collectionName];
          if (!collection) {
            send(response, 404, { error: "collection_not_found", collectionName });
            finishLog(`collection=${collectionName} error=collection_not_found`);
            return;
          }

          const recordId = parts[2];
          const record = collection.find((candidate) => candidate.id === recordId);
          if (!record) {
            send(response, 404, { error: "record_not_found", recordId });
            finishLog(`collection=${collectionName} recordId=${recordId} error=record_not_found`);
            return;
          }

          Object.assign(record, bodyAsRecord(await readBody(request)), { id: record.id });
          bumpVersion(config, state);
          send(response, 200, record);
          finishLog(`collection=${collectionName} recordId=${record.id} mutation=patch`);
          return;
        }

        if (request.method === "DELETE" && parts.length === 3) {
          const collection = state.collections[collectionName];
          if (!collection) {
            send(response, 404, { error: "collection_not_found", collectionName });
            finishLog(`collection=${collectionName} error=collection_not_found`);
            return;
          }

          const recordId = parts[2];
          const nextCollection = collection.filter((record) => record.id !== recordId);
          if (nextCollection.length === collection.length) {
            send(response, 404, { error: "record_not_found", recordId });
            finishLog(`collection=${collectionName} recordId=${recordId} error=record_not_found`);
            return;
          }

          state.collections[collectionName] = nextCollection;
          bumpVersion(config, state);
          send(response, 204);
          finishLog(`collection=${collectionName} recordId=${recordId} mutation=delete`);
          return;
        }
      }

      if (request.method === "POST" && url.pathname === "/trigger") {
        const result = config.trigger(state, bodyAsRecord(await readBody(request)) as TriggerRequest);
        if (result.accepted) {
          bumpVersion(config, state);
        }

        send(response, 200, {
          accepted: result.accepted,
          mutationSummary: result.mutationSummary,
          version: state.version,
          triggeredAt: now(),
        } satisfies TriggerResult);
        finishLog(`triggerAccepted=${result.accepted} summary="${result.mutationSummary}"`);
        return;
      }

      if (request.method === "POST" && url.pathname === "/apply-action") {
        const requestBody = bodyAsRecord(await readBody(request)) as SimulatedActionRequest;
        const handler = config.actionHandlers[requestBody.actionType];
        const stateBefore = clone(state.collections);

        if (!handler) {
          const rejected: SimulatedActionResult = {
            actionId: requestBody.actionId,
            accepted: false,
            mutationSummary: `Unsupported action type: ${requestBody.actionType}`,
            stateBefore,
            stateAfter: clone(state.collections),
            version: state.version,
            appliedAt: now(),
          };

          state.actionLogs.push(rejected);
          send(response, 400, rejected);
          finishLog(`action=${requestBody.actionType} actionId=${requestBody.actionId} issueId=${requestBody.issueId} accepted=false summary="${rejected.mutationSummary}"`);
          return;
        }

        const mutation = handler(state, requestBody);
        if (mutation.accepted) {
          bumpVersion(config, state);
        }

        const result: SimulatedActionResult = {
          actionId: requestBody.actionId,
          accepted: mutation.accepted,
          mutationSummary: mutation.mutationSummary,
          stateBefore,
          stateAfter: clone(state.collections),
          version: state.version,
          appliedAt: now(),
        };

        state.actionLogs.push(result);
        send(response, 200, result);
        finishLog(`action=${requestBody.actionType} actionId=${requestBody.actionId} issueId=${requestBody.issueId} accepted=${result.accepted} summary="${result.mutationSummary}"`);
        return;
      }

      if (request.method === "POST" && url.pathname === "/reset") {
        state = createInitialState(config);
        send(response, 200, state);
        finishLog(`reset=true events=${state.events.length} issueTypes=${issueTypesFor(state.events)}`);
        return;
      }

      send(response, 404, { error: "not_found", path: url.pathname });
      finishLog();
    } catch (error) {
      send(response, 500, {
        error: "internal_server_error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      finishLog(`error="${error instanceof Error ? error.message : "Unknown error"}"`);
    }
  });

  return {
    server,
    config,
    get state() {
      return state;
    },
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    }),
  };
};

export const startSimulatedServer = async (config: SimulatedServerConfig): Promise<RunningSimulatedServer> => {
  const running = createSimulatedServer(config);
  await new Promise<void>((resolve) => {
    running.server.listen(config.port, "127.0.0.1", resolve);
  });
  return running;
};
