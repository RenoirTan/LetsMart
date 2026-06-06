import type { Channel, IssueType, MarketplaceEvent, SourceEvent, SourceType } from "@sea-ops/schemas";
import { SimulatedSourceClient } from "./source-client.ts";

declare const process: { env?: Record<string, string | undefined> } | undefined;

const localhost = (port: number) => `http://localhost:${port}`;

type SimulatedWorkerConfig = {
  name: string;
  sourceUrl: string;
  issueTypes: IssueType[];
};

const simulatedWorkerConfigs: SimulatedWorkerConfig[] = [
  { name: "InventoryVelocityWorker", sourceUrl: localhost(5101), issueTypes: ["stockout_risk"] },
  { name: "ReviewThemeWorker", sourceUrl: localhost(5102), issueTypes: ["wrong_sku_complaint"] },
  { name: "CourierDelayWorker", sourceUrl: localhost(5103), issueTypes: ["late_delivery_spike"] },
  { name: "AdWasteWorker", sourceUrl: localhost(5104), issueTypes: ["ad_waste"] },
  { name: "MessageBacklogWorker", sourceUrl: localhost(5105), issueTypes: ["message_backlog"] },
  { name: "CompetitorActionWorker", sourceUrl: localhost(5106), issueTypes: ["competitor_action"] },
  { name: "TrendMonitorWorker", sourceUrl: localhost(5107), issueTypes: ["trend_signal"] },
  { name: "SupplierDelayWorker", sourceUrl: localhost(5108), issueTypes: ["supplier_delay"] },
];

const workerLogsEnabled = () => process?.env?.SIMULATOR_LOGS !== "0";

const logWorker = (workerName: string, message: string) => {
  if (!workerLogsEnabled()) return;
  console.log(`[worker:${workerName}] ${message}`);
};

export async function observeSimulatorEvents(client = new SimulatedSourceClient()): Promise<MarketplaceEvent[]> {
  const results = await Promise.allSettled(
    simulatedWorkerConfigs.map(async (config) => {
      logWorker(config.name, `polling ${config.sourceUrl}/events`);
      const events = await client.getEvents(config.sourceUrl);
      const matchedEvents = events
        .filter((event) => config.issueTypes.includes(event.issueType))
        .map((event) => sourceEventToMarketplaceEvent(event, config.name));
      const issueTypes = [...new Set(matchedEvents.map((event) => event.type))].join(",") || "none";
      logWorker(config.name, `received rawEvents=${events.length} matchedEvents=${matchedEvents.length} issueTypes=${issueTypes}`);
      return matchedEvents;
    }),
  );

  return results.flatMap((result, index) => {
    if (result.status === "fulfilled") return result.value;
    logWorker(simulatedWorkerConfigs[index].name, `poll failed error="${result.reason instanceof Error ? result.reason.message : "Unknown error"}"`);
    return [];
  });
}

function sourceEventToMarketplaceEvent(event: SourceEvent, workerName: string): MarketplaceEvent {
  return {
    id: event.id,
    type: event.issueType,
    sourceWorker: workerName,
    channel: channelForSource(event.sourceType),
    entityId: event.evidence[0]?.recordId,
    sku: event.sku,
    productName: event.productName,
    severity: event.severity,
    detectedAt: event.createdAt,
    evidence: event.evidence.map((item) => ({
      source: `${event.serverId}/${item.collection}`,
      recordId: item.recordId,
      field: item.label,
      value: item.value,
      note: item.label,
    })),
    metrics: {
      ...event.metrics,
      serverId: event.serverId,
      sourceVersion: event.version,
    },
  };
}

function channelForSource(sourceType: SourceType): Channel {
  const channels: Record<SourceType, Channel> = {
    inventory: "shopee",
    sku_mapping: "tiktok_shop",
    courier: "courier",
    ads: "ads",
    messages: "whatsapp",
    competitor: "shopee",
    trend: "tiktok_shop",
    supplier: "supplier_email",
  };

  return channels[sourceType];
}
