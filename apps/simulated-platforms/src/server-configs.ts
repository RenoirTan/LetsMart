import { randomUUID } from "node:crypto";
import type { MockRecord, SimulatedServerState, SourceEvent } from "@sea-ops/schemas";
import type { ActionHandler, SimulatedServerConfig } from "@sea-ops/simulated-server";

type InventoryRecord = MockRecord & {
  sku: string;
  productName: string;
  currentStock: number;
  salesVelocityPerDay: number;
  projectedInboundUnits: number;
};

type CampaignRecord = MockRecord & {
  productName: string;
  campaignName: string;
  status: "active" | "paused";
  dailyBudget: number;
  spendChangePct: number;
  conversionChangePct: number;
  topVariantSku: string;
};

const records = <T extends MockRecord>(state: SimulatedServerState, collectionName: string): T[] => {
  state.collections[collectionName] ??= [];
  return state.collections[collectionName] as T[];
};

const num = (value: unknown, fallback = 0): number => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const str = (value: unknown, fallback = ""): string => typeof value === "string" ? value : fallback;

const classifyMessageProblem = (body: string): string => {
  const text = body.toLowerCase();
  if (/refund|return|money back|bayar balik/.test(text)) return "refund_request";
  if (/exchange|change|replace|replacement/.test(text)) return "exchange_request";
  if (/broken|defect|rosak|no sound|not working|switch/.test(text)) return "defective_product";
  if (/wrong|salah|model|colour|color|case/.test(text)) return "wrong_item";
  if (/parcel|tracking|not moved|delay|lambat|ship|delivery/.test(text)) return "shipping_delay";
  if (/address|alamat/.test(text)) return "address_change";
  if (/cod|cash|payment|bayar/.test(text)) return "cod_payment";
  if (/warranty|guarantee/.test(text)) return "warranty";
  if (/stock|available|reserve|ada/.test(text)) return "stock_check";
  return "buyer_message";
};

const urgencyForProblem = (problemType: string): string => {
  if (["refund_request", "exchange_request", "defective_product", "wrong_item"].includes(problemType)) return "high";
  if (["shipping_delay", "address_change"].includes(problemType)) return "medium";
  return "low";
};

const fallbackReplyForMessage = (body: string): string => {
  const problemType = classifyMessageProblem(body);
  switch (problemType) {
    case "defective_product":
      return "Hi, sorry the item arrived with an issue. Please send your order ID plus a short photo/video of the defect so we can check exchange or warranty options for you.";
    case "wrong_item":
      return "Hi, sorry you received the wrong item. Please share your order ID and a photo of the item received, then we will guide you on the fastest exchange next step.";
    case "refund_request":
      return "Hi, sorry for the trouble. Please send your order ID and a photo/video of the issue. We will review the case and advise the correct refund or return process.";
    case "exchange_request":
      return "Hi, we can help check exchange eligibility. Please send your order ID, the item condition, and the variant you need so we can confirm the next step.";
    case "shipping_delay":
      return "Hi, sorry for the delay. Please send your order ID or tracking number and we will check the courier status and update you as soon as possible.";
    case "address_change":
      return "Hi, please send the new address and order ID. If the parcel has not shipped yet, we will try to update it before handover to courier.";
    case "cod_payment":
      return "Hi, thanks for checking. Please share your area and item, and we will confirm whether COD is available for your order.";
    case "warranty":
      return "Hi, warranty coverage depends on the item and issue. Please share the product name and order ID and we will confirm the warranty details.";
    case "stock_check":
      return "Hi, thanks for messaging. Please tell us which variant you want and when you need it, then we will confirm stock availability for you.";
    default:
      return "Hi, thanks for messaging. Please share your order ID or product details so we can help you faster.";
  }
};

const draftRecordFor = (drafts: unknown[], messageId: string): Record<string, unknown> | undefined => {
  return drafts.find((candidate): candidate is Record<string, unknown> => (
    Boolean(candidate) &&
    typeof candidate === "object" &&
    !Array.isArray(candidate) &&
    (candidate as Record<string, unknown>).messageId === messageId
  ));
};

const addTask = (state: SimulatedServerState, title: string, payload: Record<string, unknown>) => {
  records(state, "tasks").push({
    id: randomUUID(),
    title,
    status: "open",
    payload,
    createdAt: new Date().toISOString(),
  });
};

const createInternalTask: ActionHandler = (state, request) => {
  addTask(state, str(request.payload.title, `Review ${request.issueId}`), request.payload);
  return { accepted: true, mutationSummary: "Created an internal task in the simulated platform." };
};

const eventBase = (
  state: SimulatedServerState,
  issueType: SourceEvent["issueType"],
  sourceType: SourceEvent["sourceType"],
): Pick<SourceEvent, "id" | "serverId" | "issueType" | "sourceType" | "version" | "createdAt"> => ({
  id: `${state.serverId}:${issueType}:${state.version}`,
  serverId: state.serverId,
  issueType,
  sourceType,
  version: state.version,
  createdAt: state.lastUpdatedAt,
});

const shopeeInventoryConfig: SimulatedServerConfig = {
  serverId: "shopee-inventory-server",
  displayName: "Shopee Inventory Server",
  port: 5101,
  initialCollections: {
    inventory: [
      { id: "inv-earbuds", sku: "WE-BLK-SEA", productName: "Wireless Earbuds", channel: "Shopee", currentStock: 12, salesVelocityPerDay: 9, projectedInboundUnits: 0, reorderThresholdDays: 2 },
    ],
    orders: [
      { id: "ord-shp-1001", sku: "WE-BLK-SEA", quantity: 3, orderedAt: "2026-06-06T09:10:00+08:00" },
      { id: "ord-shp-1002", sku: "WE-BLK-SEA", quantity: 2, orderedAt: "2026-06-06T10:22:00+08:00" },
    ],
    supplierPurchaseOrders: [],
    tasks: [],
  },
  detectEvents: (state) => {
    const lowStock = records<InventoryRecord>(state, "inventory").find((item) => {
      const coverageDays = (item.currentStock + item.projectedInboundUnits) / item.salesVelocityPerDay;
      return coverageDays <= num(item.reorderThresholdDays, 2);
    });
    if (!lowStock) return [];

    const coverageDays = Number(((lowStock.currentStock + lowStock.projectedInboundUnits) / lowStock.salesVelocityPerDay).toFixed(1));
    return [{
      ...eventBase(state, "stockout_risk", "inventory"),
      severity: "high",
      productName: lowStock.productName,
      sku: lowStock.sku,
      metrics: { currentStock: lowStock.currentStock, salesVelocityPerDay: lowStock.salesVelocityPerDay, estimatedStockoutDays: coverageDays, projectedInboundUnits: lowStock.projectedInboundUnits },
      evidence: [
        { collection: "inventory", recordId: lowStock.id, label: "Current stock", value: lowStock.currentStock },
        { collection: "inventory", recordId: lowStock.id, label: "Sales velocity per day", value: lowStock.salesVelocityPerDay },
        { collection: "inventory", recordId: lowStock.id, label: "Estimated days left", value: coverageDays },
      ],
    }];
  },
  trigger: (state) => {
    const item = records<InventoryRecord>(state, "inventory")[0];
    item.currentStock = Math.min(item.currentStock, 8);
    item.salesVelocityPerDay = Math.max(item.salesVelocityPerDay, 10);
    records(state, "orders").push({ id: `ord-shp-${Date.now()}`, sku: item.sku, quantity: 4, orderedAt: new Date().toISOString() });
    return { accepted: true, mutationSummary: "Injected new Shopee orders that worsened the Wireless Earbuds stockout risk." };
  },
  actionHandlers: {
    create_internal_task: createInternalTask,
    reorder_inventory: (state, request) => {
      const sku = str(request.payload.sku, "WE-BLK-SEA");
      const quantity = num(request.payload.quantity, num(request.payload.recommendedQty, 120));
      const item = records<InventoryRecord>(state, "inventory").find((candidate) => candidate.sku === sku);
      if (!item) return { accepted: false, mutationSummary: `No inventory record found for SKU ${sku}.` };
      item.projectedInboundUnits += quantity;
      records(state, "supplierPurchaseOrders").push({ id: `po-${Date.now()}`, sku, quantity, status: "simulated_created", approvedBy: request.approvedBy, createdAt: new Date().toISOString() });
      return { accepted: true, mutationSummary: `Created simulated purchase order for ${quantity} units of ${sku}.` };
    },
  },
};

const tiktokSkuConfig: SimulatedServerConfig = {
  serverId: "tiktok-sku-server",
  displayName: "TikTok SKU Mapping Server",
  port: 5102,
  initialCollections: {
    skuMappings: [
      { id: "map-phone-case-blue", tiktokSku: "PC-IP15-CLR", warehouseSku: "WH-CASE-IP14-RED", productName: "Phone Case", expectedColor: "clear", warehouseColor: "red", fulfilmentStatus: "active" },
    ],
    complaints: [
      { id: "cmp-1", sku: "PC-IP15-CLR", channel: "TikTok Shop", theme: "wrong_color", message: "Ordered clear, received red." },
      { id: "cmp-2", sku: "PC-IP15-CLR", channel: "TikTok Shop", theme: "wrong_color", message: "Color salah, got red instead of clear." },
      { id: "cmp-3", sku: "PC-IP15-CLR", channel: "TikTok Shop", theme: "wrong_color", message: "Wrong colour delivered." },
    ],
    tasks: [],
  },
  detectEvents: (state) => {
    const mapping = records<MockRecord>(state, "skuMappings").find((candidate) => candidate.fulfilmentStatus !== "paused" && candidate.expectedColor !== candidate.warehouseColor);
    if (!mapping) return [];
    const complaintCount = records<MockRecord>(state, "complaints").filter((complaint) => complaint.sku === mapping.tiktokSku && complaint.theme === "wrong_color").length;
    if (complaintCount < 3) return [];
    return [{
      ...eventBase(state, "wrong_sku_complaint", "sku_mapping"),
      severity: "high",
      productName: str(mapping.productName, "Phone Case"),
      sku: str(mapping.tiktokSku),
      metrics: { complaintCount, expectedColor: str(mapping.expectedColor), warehouseColor: str(mapping.warehouseColor), fulfilmentStatus: str(mapping.fulfilmentStatus) },
      evidence: [
        { collection: "skuMappings", recordId: mapping.id, label: "TikTok SKU", value: str(mapping.tiktokSku) },
        { collection: "skuMappings", recordId: mapping.id, label: "Warehouse SKU", value: str(mapping.warehouseSku) },
        { collection: "complaints", recordId: "wrong-color-theme", label: "Wrong color complaints", value: complaintCount },
      ],
    }];
  },
  trigger: (state) => {
    records(state, "complaints").push({ id: `cmp-${Date.now()}`, sku: "PC-IP15-CLR", channel: "TikTok Shop", theme: "wrong_color", message: "Just received the wrong colour again." });
    return { accepted: true, mutationSummary: "Injected another TikTok Shop wrong-colour complaint." };
  },
  actionHandlers: {
    create_internal_task: createInternalTask,
    pause_fulfilment: (state, request) => {
      const sku = str(request.payload.sku, "PC-IP15-CLR");
      const mapping = records<MockRecord>(state, "skuMappings").find((candidate) => candidate.tiktokSku === sku);
      if (!mapping) return { accepted: false, mutationSummary: `No SKU mapping found for ${sku}.` };
      mapping.fulfilmentStatus = "paused";
      addTask(state, `Fix warehouse mapping for ${sku}`, request.payload);
      return { accepted: true, mutationSummary: `Paused simulated fulfilment for ${sku} and created a warehouse mapping task.` };
    },
  },
};

const courierDelayConfig: SimulatedServerConfig = {
  serverId: "courier-delay-server",
  displayName: "Courier Delay Server",
  port: 5103,
  initialCollections: {
    tracking: Array.from({ length: 17 }, (_item, index) => ({ id: `trk-jnt-${index + 1}`, courier: "J&T Express", region: "Klang Valley", status: "delayed", delayedHours: 36 + index, customerUpdateStatus: "not_sent" })),
    messageDrafts: [],
    tasks: [],
  },
  detectEvents: (state) => {
    const delayed = records<MockRecord>(state, "tracking").filter((item) => item.courier === "J&T Express" && item.status === "delayed" && item.customerUpdateStatus !== "sent");
    if (delayed.length < 10) return [];
    return [{
      ...eventBase(state, "late_delivery_spike", "courier"),
      severity: "medium",
      metrics: { courier: "J&T Express", region: "Klang Valley", affectedOrders: delayed.length, maxDelayedHours: Math.max(...delayed.map((item) => num(item.delayedHours))) },
      evidence: [
        { collection: "tracking", recordId: "jnt-klang-valley", label: "Affected delayed orders", value: delayed.length },
        { collection: "tracking", recordId: delayed[0].id, label: "Sample delayed order", value: str(delayed[0].id) },
      ],
    }];
  },
  trigger: (state) => {
    records(state, "tracking").push({ id: `trk-jnt-${Date.now()}`, courier: "J&T Express", region: "Klang Valley", status: "delayed", delayedHours: 44, customerUpdateStatus: "not_sent" });
    return { accepted: true, mutationSummary: "Injected a new J&T Express delayed tracking record." };
  },
  actionHandlers: {
    create_internal_task: createInternalTask,
    draft_buyer_reply: (state, request) => {
      const delayed = records<MockRecord>(state, "tracking").filter((item) => item.status === "delayed");
      records(state, "messageDrafts").push({ id: `draft-courier-${Date.now()}`, orderCount: delayed.length, body: str(request.payload.body, "Sorry for the delay. Your parcel is still moving with J&T Express."), createdAt: new Date().toISOString() });
      return { accepted: true, mutationSummary: `Drafted customer update for ${delayed.length} delayed orders.` };
    },
    send_bulk_customer_update: (state) => {
      const delayed = records<MockRecord>(state, "tracking").filter((item) => item.status === "delayed");
      delayed.forEach((item) => { item.customerUpdateStatus = "sent"; });
      return { accepted: true, mutationSummary: `Marked ${delayed.length} courier delay updates as sent.` };
    },
  },
};

const adsWasteConfig: SimulatedServerConfig = {
  serverId: "ads-waste-server",
  displayName: "Ad Campaign Waste Server",
  port: 5104,
  initialCollections: {
    campaigns: [{ id: "camp-desk-lamp", productName: "Desk Lamp", campaignName: "Shopee 6.6 Desk Lamp Push", status: "active", dailyBudget: 120, spendChangePct: 42, conversionChangePct: -31, topVariantSku: "DL-WHT-MY" }],
    inventoryVariants: [
      { id: "var-lamp-white", sku: "DL-WHT-MY", productName: "Desk Lamp", stock: 0, isTopVariant: true },
      { id: "var-lamp-black", sku: "DL-BLK-MY", productName: "Desk Lamp", stock: 16, isTopVariant: false },
    ],
    tasks: [],
  },
  detectEvents: (state) => {
    const campaign = records<CampaignRecord>(state, "campaigns").find((item) => item.status === "active");
    if (!campaign) return [];
    const topVariant = records<MockRecord>(state, "inventoryVariants").find((item) => item.sku === campaign.topVariantSku && num(item.stock) <= 0);
    if (!topVariant || campaign.spendChangePct < 30 || campaign.conversionChangePct > -20) return [];
    return [{
      ...eventBase(state, "ad_waste", "ads"),
      severity: "high",
      productName: campaign.productName,
      sku: campaign.topVariantSku,
      metrics: { campaignStatus: campaign.status, dailyBudget: campaign.dailyBudget, spendChangePct: campaign.spendChangePct, conversionChangePct: campaign.conversionChangePct, topVariantStock: num(topVariant.stock) },
      evidence: [
        { collection: "campaigns", recordId: campaign.id, label: "Spend change", value: campaign.spendChangePct },
        { collection: "campaigns", recordId: campaign.id, label: "Conversion change", value: campaign.conversionChangePct },
        { collection: "inventoryVariants", recordId: topVariant.id, label: "Top variant stock", value: num(topVariant.stock) },
      ],
    }];
  },
  trigger: (state) => {
    const campaign = records<CampaignRecord>(state, "campaigns")[0];
    campaign.status = "active";
    campaign.spendChangePct = 55;
    campaign.conversionChangePct = -38;
    records<MockRecord>(state, "inventoryVariants")[0].stock = 0;
    return { accepted: true, mutationSummary: "Injected a sharper ad-waste anomaly for the Desk Lamp campaign." };
  },
  actionHandlers: {
    create_internal_task: createInternalTask,
    pause_ad_campaign: (state, request) => {
      const campaignId = str(request.payload.campaignId, str(request.payload.entityId, "camp-desk-lamp"));
      const campaign = records<CampaignRecord>(state, "campaigns").find((item) => item.id === campaignId);
      if (!campaign) return { accepted: false, mutationSummary: `No campaign found for ${campaignId}.` };
      campaign.status = "paused";
      return { accepted: true, mutationSummary: `Paused simulated ad campaign ${campaign.campaignName}.` };
    },
    change_ad_budget: (state, request) => {
      const campaign = records<CampaignRecord>(state, "campaigns")[0];
      campaign.dailyBudget = num(request.payload.dailyBudget, num(request.payload.recommendedDailyBudget, 40));
      return { accepted: true, mutationSummary: `Changed simulated campaign budget to ${campaign.dailyBudget}.` };
    },
  },
};

const whatsappBacklogConfig: SimulatedServerConfig = {
  serverId: "whatsapp-backlog-server",
  displayName: "WhatsApp Buyer Backlog Server",
  port: 5105,
  initialCollections: {
    messages: [
      { id: "wa-msg-1", buyerName: "Aina", body: "Still available ah? Need before Raya.", productName: "Wireless Earbuds", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-2", buyerName: "Daniel", body: "My parcel has not moved for 4 days. Can you check?", productName: "Desk Lamp", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-3", buyerName: "Mei Ling", body: "The lamp arrived but the switch is broken. Can exchange?", productName: "Desk Lamp", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-4", buyerName: "Budi", body: "I received the wrong phone case model. I ordered iPhone 15.", productName: "Phone Case", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-5", buyerName: "Farah", body: "Can I refund? Earbuds left side no sound.", productName: "Wireless Earbuds", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-6", buyerName: "Mark", body: "Can change delivery address before shipping?", productName: "Desk Lamp", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-7", buyerName: "Siti", body: "Is COD available for Shah Alam?", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-8", buyerName: "Rizal", body: "Warranty how long for the desk lamp?", productName: "Desk Lamp", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-9", buyerName: "Nurul", body: "I need this as birthday gift by Friday. Can arrive or not?", productName: "Wireless Earbuds", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-10", buyerName: "Jason", body: "The box was dented and item has scratches. What can you do?", productName: "Desk Lamp", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-11", buyerName: "Putri", body: "Saya dapat warna salah, boleh tukar warna putih?", productName: "Desk Lamp", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-12", buyerName: "Hakim", body: "Tracking says delivered but I did not receive it.", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-13", buyerName: "Grace", body: "Can reserve one black earbuds until tonight?", productName: "Wireless Earbuds", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-14", buyerName: "Arif", body: "I want cancel before courier pickup, can?", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-15", buyerName: "Lina", body: "Do you have invoice for company claim?", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-16", buyerName: "Ken", body: "Phone case buttons are too tight. Is this defect?", productName: "Phone Case", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-17", buyerName: "Maya", body: "Courier called but I missed it. Can arrange second delivery?", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-18", buyerName: "Tommy", body: "Payment failed on TikTok Shop but money deducted. Please help.", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-19", buyerName: "Zara", body: "Can you recommend which lamp colour is brighter?", productName: "Desk Lamp", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-20", buyerName: "Wei", body: "Need replacement cable for earbuds charging case.", productName: "Wireless Earbuds", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-21", buyerName: "Irfan", body: "Barang lambat sangat, can expedite?", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-22", buyerName: "Priya", body: "I ordered two units but received one only.", status: "unanswered", urgency: "unclassified", replyDraft: "" },
      { id: "wa-msg-23", buyerName: "Omar", body: "Can self pickup today?", status: "unanswered", urgency: "unclassified", replyDraft: "" },
    ],
    tasks: [],
  },
  detectEvents: (state) => {
    const unanswered = records<MockRecord>(state, "messages").filter((message) => message.status === "unanswered");
    if (unanswered.length < 10) return [];
    const drafted = unanswered.filter((message) => str(message.replyDraft).length > 0).length;
    return [{
      ...eventBase(state, "message_backlog", "messages"),
      severity: "medium",
      metrics: { unansweredMessages: unanswered.length, draftedReplies: drafted },
      evidence: [
        { collection: "messages", recordId: "whatsapp-unanswered", label: "Unanswered buyer messages", value: unanswered.length },
        { collection: "messages", recordId: unanswered[0].id, label: "Sample message", value: str(unanswered[0].body) },
      ],
    }];
  },
  trigger: (state) => {
    records(state, "messages").push({ id: `wa-msg-${Date.now()}`, buyerName: "New Buyer", body: "The item arrived damaged. Can I exchange it?", status: "unanswered", urgency: "unclassified", replyDraft: "" });
    return { accepted: true, mutationSummary: "Injected a new unanswered WhatsApp buyer message." };
  },
  actionHandlers: {
    create_internal_task: createInternalTask,
    draft_buyer_reply: (state, request) => {
      const unanswered = records<MockRecord>(state, "messages").filter((message) => message.status === "unanswered");
      const drafts = Array.isArray(request.payload.replyDrafts) ? request.payload.replyDrafts : [];
      unanswered.forEach((message) => {
        const body = str(message.body);
        const fallbackProblem = classifyMessageProblem(body);
        const draft = draftRecordFor(drafts, message.id);
        const problemType = str(draft?.problemType, fallbackProblem);
        message.problemType = problemType;
        message.urgency = str(draft?.urgency, urgencyForProblem(problemType));
        message.replyDraft = str(draft?.draftText, fallbackReplyForMessage(body));
      });
      return { accepted: true, mutationSummary: `Drafted replies for ${unanswered.length} WhatsApp messages.` };
    },
    send_buyer_message: (state) => {
      const drafted = records<MockRecord>(state, "messages").filter((message) => message.status === "unanswered" && str(message.replyDraft).length > 0);
      drafted.forEach((message) => {
        message.status = "sent";
        message.sentAt = new Date().toISOString();
      });
      return { accepted: true, mutationSummary: `Sent ${drafted.length} drafted WhatsApp replies.` };
    },
    send_bulk_customer_update: (state) => {
      const unanswered = records<MockRecord>(state, "messages").filter((message) => message.status === "unanswered");
      unanswered.forEach((message) => { message.status = "sent"; });
      return { accepted: true, mutationSummary: `Sent ${unanswered.length} simulated WhatsApp replies.` };
    },
  },
};

const competitorWatchConfig: SimulatedServerConfig = {
  serverId: "competitor-watch-server",
  displayName: "Competitor Watch Server",
  port: 5106,
  initialCollections: {
    ownListings: [{ id: "own-desk-lamp", productName: "Desk Lamp", marketplace: "Shopee", price: 39.9, grossMarginPct: 32 }],
    competitorSnapshots: [{ id: "comp-1", productName: "Desk Lamp", marketplace: "Shopee", competitor: "BrightHome MY", price: 34.9, voucherPct: 10, stockStatus: "in_stock" }],
    tasks: [],
  },
  detectEvents: (state) => {
    const own = records<MockRecord>(state, "ownListings")[0];
    const competitor = records<MockRecord>(state, "competitorSnapshots")[0];
    const undercutPct = Number((((num(own.price) - num(competitor.price)) / num(own.price)) * 100).toFixed(1));
    if (undercutPct < 10 && num(competitor.voucherPct) < 5) return [];
    return [{
      ...eventBase(state, "competitor_action", "competitor"),
      severity: "medium",
      productName: str(own.productName),
      metrics: { ownPrice: num(own.price), competitorPrice: num(competitor.price), undercutPct, competitorVoucherPct: num(competitor.voucherPct) },
      evidence: [
        { collection: "ownListings", recordId: own.id, label: "Own price", value: num(own.price) },
        { collection: "competitorSnapshots", recordId: competitor.id, label: "Competitor price", value: num(competitor.price) },
        { collection: "competitorSnapshots", recordId: competitor.id, label: "Competitor voucher", value: num(competitor.voucherPct) },
      ],
    }];
  },
  trigger: (state) => {
    const competitor = records<MockRecord>(state, "competitorSnapshots")[0];
    competitor.price = 32.9;
    competitor.voucherPct = 15;
    return { accepted: true, mutationSummary: "Injected a competitor price drop and voucher spike." };
  },
  actionHandlers: {
    create_internal_task: createInternalTask,
    change_price: (state, request) => {
      const listing = records<MockRecord>(state, "ownListings")[0];
      listing.price = num(request.payload.price, num(listing.price));
      return { accepted: true, mutationSummary: `Changed simulated listing price to ${listing.price}.` };
    },
  },
};

const trendWatchConfig: SimulatedServerConfig = {
  serverId: "trend-watch-server",
  displayName: "Marketplace Trend Watch Server",
  port: 5107,
  initialCollections: {
    trendSignals: [{ id: "trend-mini-fan", keyword: "portable mini fan", category: "Home & Living", marketplace: "TikTok Shop", growthPct: 165, reviewed: false }],
    supplierDrafts: [],
    listingDrafts: [],
    tasks: [],
  },
  detectEvents: (state) => {
    const trend = records<MockRecord>(state, "trendSignals").find((item) => num(item.growthPct) >= 100 && item.reviewed !== true);
    if (!trend) return [];
    return [{
      ...eventBase(state, "trend_signal", "trend"),
      severity: "low",
      productName: str(trend.keyword),
      metrics: { keyword: str(trend.keyword), category: str(trend.category), marketplace: str(trend.marketplace), growthPct: num(trend.growthPct) },
      evidence: [
        { collection: "trendSignals", recordId: trend.id, label: "Search growth", value: num(trend.growthPct) },
        { collection: "trendSignals", recordId: trend.id, label: "Marketplace", value: str(trend.marketplace) },
      ],
    }];
  },
  trigger: (state) => {
    const trend = records<MockRecord>(state, "trendSignals")[0];
    trend.growthPct = 220;
    trend.reviewed = false;
    return { accepted: true, mutationSummary: "Injected a stronger TikTok Shop trend spike." };
  },
  actionHandlers: {
    create_internal_task: (state, request) => {
      createInternalTask(state, request);
      const trend = records<MockRecord>(state, "trendSignals")[0];
      trend.reviewed = true;
      return { accepted: true, mutationSummary: "Created trend opportunity task and marked signal reviewed." };
    },
    draft_supplier_email: (state, request) => {
      records(state, "supplierDrafts").push({ id: `supplier-draft-${Date.now()}`, body: str(request.payload.body, "Can you quote portable mini fan supply and lead time?"), createdAt: new Date().toISOString() });
      return { accepted: true, mutationSummary: "Created supplier inquiry draft for trend opportunity." };
    },
  },
};

const supplierDelayConfig: SimulatedServerConfig = {
  serverId: "supplier-delay-server",
  displayName: "Supplier Delay Server",
  port: 5108,
  initialCollections: {
    supplierEmails: [{ id: "email-supplier-1", supplier: "Shenzhen Audio Co.", sku: "WE-BLK-SEA", subject: "Replenishment ETA update", delayDays: 5, followUpStatus: "not_sent" }],
    supplierDrafts: [],
    tasks: [],
  },
  detectEvents: (state) => {
    const delayedEmail = records<MockRecord>(state, "supplierEmails").find((email) => num(email.delayDays) >= 3 && email.followUpStatus !== "sent");
    if (!delayedEmail) return [];
    return [{
      ...eventBase(state, "supplier_delay", "supplier"),
      severity: "medium",
      sku: str(delayedEmail.sku),
      metrics: { supplier: str(delayedEmail.supplier), sku: str(delayedEmail.sku), delayDays: num(delayedEmail.delayDays), followUpStatus: str(delayedEmail.followUpStatus) },
      evidence: [
        { collection: "supplierEmails", recordId: delayedEmail.id, label: "Supplier", value: str(delayedEmail.supplier) },
        { collection: "supplierEmails", recordId: delayedEmail.id, label: "Delay days", value: num(delayedEmail.delayDays) },
      ],
    }];
  },
  trigger: (state) => {
    const email = records<MockRecord>(state, "supplierEmails")[0];
    email.delayDays = 7;
    email.followUpStatus = "not_sent";
    return { accepted: true, mutationSummary: "Injected a longer supplier replenishment delay." };
  },
  actionHandlers: {
    create_internal_task: createInternalTask,
    draft_supplier_email: (state, request) => {
      records(state, "supplierDrafts").push({ id: `supplier-follow-up-${Date.now()}`, supplier: "Shenzhen Audio Co.", body: str(request.payload.body, "Please confirm the new replenishment ETA and partial shipment options."), status: "drafted" });
      return { accepted: true, mutationSummary: "Drafted supplier follow-up email." };
    },
    contact_supplier: (state) => {
      records<MockRecord>(state, "supplierEmails").forEach((email) => { email.followUpStatus = "sent"; });
      return { accepted: true, mutationSummary: "Marked simulated supplier follow-up as sent." };
    },
  },
};

export const simulatedServerConfigs: SimulatedServerConfig[] = [
  shopeeInventoryConfig,
  tiktokSkuConfig,
  courierDelayConfig,
  adsWasteConfig,
  whatsappBacklogConfig,
  competitorWatchConfig,
  trendWatchConfig,
  supplierDelayConfig,
];

export const getSimulatedServerConfig = (serverId: string): SimulatedServerConfig | undefined => {
  return simulatedServerConfigs.find((config) => config.serverId === serverId);
};
