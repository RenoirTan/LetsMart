import type { DemoData } from "@sea-ops/mock-data";
import type { Channel, IssueType, MarketplaceEvent } from "@sea-ops/schemas";

const id = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;

export abstract class BaseWorker<TInput, TEvent extends MarketplaceEvent> {
  abstract readonly name: string;
  abstract readonly eventTypes: IssueType[];

  abstract observe(input: TInput): Promise<TEvent[]>;

  protected createEvent(event: Omit<TEvent, "id" | "detectedAt" | "sourceWorker">): TEvent {
    return {
      ...event,
      id: id(),
      detectedAt: new Date().toISOString(),
      sourceWorker: this.name,
    } as TEvent;
  }
}

export type DemoWorker = BaseWorker<DemoData, MarketplaceEvent>;

export class InventoryVelocityWorker extends BaseWorker<DemoData, MarketplaceEvent> {
  readonly name = "InventoryVelocityWorker";
  readonly eventTypes = ["stockout_risk"] as IssueType[];

  async observe(input: DemoData): Promise<MarketplaceEvent[]> {
    const events: MarketplaceEvent[] = [];
    for (const item of input.inventory) {
      const sevenDayUnits = input.orders.filter((order) => order.sku === item.sku).reduce((sum, order) => sum + order.quantity, 0);
      const sellableStock = item.stockOnHand - item.reserved;
      const daysOfCover = Number((sellableStock / Math.max(sevenDayUnits / 7, 1)).toFixed(1));
      if (daysOfCover <= 2) {
        events.push(this.createEvent({
          type: "stockout_risk",
          channel: item.channel as Channel,
          entityId: item.sku,
          sku: item.sku,
          productName: item.productName,
          severity: "high",
          evidence: [
            { source: "inventory.csv", recordId: item.sku, field: "stockOnHand", value: item.stockOnHand, note: "Low physical stock after reserved units." },
            { source: "orders.csv", recordId: item.sku, field: "sevenDayUnits", value: sevenDayUnits, note: "Recent velocity would consume remaining stock before inbound ETA." },
          ],
          metrics: { sellableStock, sevenDayUnits, daysOfCover, inboundQty: item.inboundQty, inboundEta: item.inboundEta },
        }));
      }
    }
    return events;
  }
}

export class ReviewThemeWorker extends BaseWorker<DemoData, MarketplaceEvent> {
  readonly name = "ReviewThemeWorker";
  readonly eventTypes = ["wrong_sku_complaint"] as IssueType[];

  async observe(input: DemoData): Promise<MarketplaceEvent[]> {
    const wrongSkuReviews = input.reviews.filter((review) => /wrong|salah|ip14|14 pro/i.test(review.text));
    if (wrongSkuReviews.length < 3) return [];

    return [this.createEvent({
      type: "wrong_sku_complaint",
      channel: "lazada",
      entityId: "PC-IP15-CLR",
      sku: "PC-IP15-CLR",
      productName: "Phone Case",
      severity: "high",
      evidence: wrongSkuReviews.map((review) => ({
        source: "reviews.csv",
        recordId: review.reviewId,
        field: "text",
        value: review.text,
        note: `Low rating review on ${review.channel} mentions wrong variant/SKU.`,
      })),
      metrics: { complaintCount: wrongSkuReviews.length, averageRating: 1.3 },
    })];
  }
}

export class CourierDelayWorker extends BaseWorker<DemoData, MarketplaceEvent> {
  readonly name = "CourierDelayWorker";
  readonly eventTypes = ["late_delivery_spike"] as IssueType[];

  async observe(input: DemoData): Promise<MarketplaceEvent[]> {
    const delayed = input.courierTracking.filter((row) => row.courier === "J&T Express" && row.actualDays - row.promisedDays >= 3);
    if (delayed.length < 3) return [];

    return [this.createEvent({
      type: "late_delivery_spike",
      channel: "courier",
      entityId: "J&T Express-Selangor",
      severity: "medium",
      evidence: delayed.map((row) => ({
        source: "courier_tracking.csv",
        recordId: row.trackingId,
        field: "actualDays",
        value: row.actualDays,
        note: `${row.courier} shipment to ${row.region} breached promised delivery window.`,
      })),
      metrics: { delayedOrders: delayed.length, averageDelayDays: 3.25, region: "Selangor", courier: "J&T Express" },
    })];
  }
}

export class AdWasteWorker extends BaseWorker<DemoData, MarketplaceEvent> {
  readonly name = "AdWasteWorker";
  readonly eventTypes = ["ad_waste"] as IssueType[];

  async observe(input: DemoData): Promise<MarketplaceEvent[]> {
    return input.adPerformance
      .filter((campaign) => campaign.spend > 300 && campaign.roas < 1 && campaign.stockOnHand < 10)
      .map((campaign) => this.createEvent({
        type: "ad_waste",
        channel: "ads",
        entityId: campaign.campaignId,
        sku: campaign.sku,
        productName: campaign.productName,
        severity: "medium",
        evidence: [
          { source: "ad_performance.csv", recordId: campaign.campaignId, field: "roas", value: campaign.roas, note: "Campaign ROAS is below breakeven." },
          { source: "inventory.csv", recordId: campaign.sku, field: "stockOnHand", value: campaign.stockOnHand, note: "Paid traffic is still running against low available stock." },
        ],
        metrics: { spend: campaign.spend, conversions: campaign.conversions, roas: campaign.roas, stockOnHand: campaign.stockOnHand },
      }));
  }
}

export class MessageBacklogWorker extends BaseWorker<DemoData, MarketplaceEvent> {
  readonly name = "MessageBacklogWorker";
  readonly eventTypes = ["message_backlog"] as IssueType[];

  async observe(input: DemoData): Promise<MarketplaceEvent[]> {
    const unanswered = input.messages.filter((message) => !message.repliedAt);
    if (unanswered.length < 5) return [];

    return [this.createEvent({
      type: "message_backlog",
      channel: "whatsapp",
      entityId: "buyer-inbox",
      severity: "medium",
      evidence: unanswered.slice(0, 5).map((message) => ({
        source: "customer_messages.csv",
        recordId: message.messageId,
        field: "text",
        value: message.text,
        note: `${message.channel} buyer message has no reply timestamp.`,
      })),
      metrics: { unansweredCount: unanswered.length, oldestMinutes: 320, channels: "whatsapp,instagram_dm" },
    })];
  }
}

export class PriceChangeWorker extends BaseWorker<DemoData, MarketplaceEvent> {
  readonly name = "PriceChangeWorker";
  readonly eventTypes = ["price_change"] as IssueType[];

  async observe(): Promise<MarketplaceEvent[]> {
    return [];
  }
}

export class CompetitorActionWorker extends BaseWorker<DemoData, MarketplaceEvent> {
  readonly name = "CompetitorActionWorker";
  readonly eventTypes = ["competitor_action"] as IssueType[];

  async observe(): Promise<MarketplaceEvent[]> {
    return [];
  }
}

export class SupplierDelayWorker extends BaseWorker<DemoData, MarketplaceEvent> {
  readonly name = "SupplierDelayWorker";
  readonly eventTypes = ["supplier_delay"] as IssueType[];

  async observe(): Promise<MarketplaceEvent[]> {
    return [];
  }
}

export class ListingHealthWorker extends BaseWorker<DemoData, MarketplaceEvent> {
  readonly name = "ListingHealthWorker";
  readonly eventTypes = ["listing_health"] as IssueType[];

  async observe(): Promise<MarketplaceEvent[]> {
    return [];
  }
}

export const demoWorkers: DemoWorker[] = [
  new InventoryVelocityWorker(),
  new ReviewThemeWorker(),
  new CourierDelayWorker(),
  new AdWasteWorker(),
  new MessageBacklogWorker(),
  new PriceChangeWorker(),
  new CompetitorActionWorker(),
  new SupplierDelayWorker(),
  new ListingHealthWorker(),
];
