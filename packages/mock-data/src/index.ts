export interface InventoryRow {
  sku: string;
  productName: string;
  variant: string;
  channel: string;
  stockOnHand: number;
  reserved: number;
  inboundQty: number;
  inboundEta: string;
}

export interface OrderRow {
  orderId: string;
  channel: string;
  sku: string;
  productName: string;
  quantity: number;
  region: string;
  courier: string;
  orderedAt: string;
  status: string;
}

export interface MessageRow {
  messageId: string;
  channel: string;
  buyerName: string;
  sku?: string;
  productName?: string;
  text: string;
  receivedAt: string;
  repliedAt?: string;
}

export interface ReviewRow {
  reviewId: string;
  channel: string;
  sku: string;
  productName: string;
  rating: number;
  text: string;
  createdAt: string;
}

export interface CourierTrackingRow {
  trackingId: string;
  orderId: string;
  courier: string;
  region: string;
  promisedDays: number;
  actualDays: number;
  status: string;
}

export interface AdPerformanceRow {
  campaignId: string;
  channel: string;
  campaignName: string;
  sku: string;
  productName: string;
  spend: number;
  clicks: number;
  conversions: number;
  roas: number;
  stockOnHand: number;
}

export interface DemoData {
  inventory: InventoryRow[];
  orders: OrderRow[];
  messages: MessageRow[];
  reviews: ReviewRow[];
  courierTracking: CourierTrackingRow[];
  adPerformance: AdPerformanceRow[];
}

export const demoData: DemoData = {
  inventory: [
    {
      sku: "WE-BLK-SEA",
      productName: "Wireless Earbuds",
      variant: "Black / SEA plug",
      channel: "shopee",
      stockOnHand: 18,
      reserved: 9,
      inboundQty: 250,
      inboundEta: "2026-06-14",
    },
    {
      sku: "PC-IP15-CLR",
      productName: "Phone Case",
      variant: "iPhone 15 Clear",
      channel: "lazada",
      stockOnHand: 144,
      reserved: 12,
      inboundQty: 0,
      inboundEta: "",
    },
    {
      sku: "DL-WHT-MY",
      productName: "Desk Lamp",
      variant: "White / Malaysia",
      channel: "tiktok_shop",
      stockOnHand: 7,
      reserved: 3,
      inboundQty: 60,
      inboundEta: "2026-06-10",
    },
  ],
  orders: [
    ...Array.from({ length: 26 }, (_, index) => ({
      orderId: `SHP-WE-${String(index + 1).padStart(3, "0")}`,
      channel: "shopee",
      sku: "WE-BLK-SEA",
      productName: "Wireless Earbuds",
      quantity: 1,
      region: index % 2 === 0 ? "Selangor" : "Metro Manila",
      courier: index % 3 === 0 ? "J&T Express" : "Ninja Van",
      orderedAt: `2026-06-${String(1 + (index % 5)).padStart(2, "0")}T10:00:00.000Z`,
      status: "paid",
    })),
    { orderId: "LZD-PC-201", channel: "lazada", sku: "PC-IP15-CLR", productName: "Phone Case", quantity: 1, region: "Jakarta", courier: "J&T Express", orderedAt: "2026-06-05T03:15:00.000Z", status: "delivered" },
    { orderId: "LZD-PC-202", channel: "lazada", sku: "PC-IP15-CLR", productName: "Phone Case", quantity: 1, region: "Jakarta", courier: "J&T Express", orderedAt: "2026-06-05T04:12:00.000Z", status: "delivered" },
  ],
  messages: [
    { messageId: "WA-001", channel: "whatsapp", buyerName: "Aina", sku: "WE-BLK-SEA", productName: "Wireless Earbuds", text: "Hi kak, masih ada stock? Need before Raya.", receivedAt: "2026-06-06T01:00:00.000Z" },
    { messageId: "WA-002", channel: "whatsapp", buyerName: "Dewi", sku: "PC-IP15-CLR", productName: "Phone Case", text: "Barang salah, saya order iPhone 15 tapi dapat 14 pro", receivedAt: "2026-06-06T01:08:00.000Z" },
    { messageId: "WA-003", channel: "whatsapp", buyerName: "Mark", productName: "Desk Lamp", text: "Can deliver to Quezon City today?", receivedAt: "2026-06-06T01:21:00.000Z" },
    { messageId: "WA-004", channel: "whatsapp", buyerName: "Nur", text: "Sis boleh COD area Shah Alam?", receivedAt: "2026-06-06T01:39:00.000Z" },
    { messageId: "IG-001", channel: "instagram_dm", buyerName: "@homebylia", productName: "Desk Lamp", text: "Still waiting reply on my TikTok order", receivedAt: "2026-06-06T02:04:00.000Z" },
    { messageId: "WA-005", channel: "whatsapp", buyerName: "Budi", text: "Tolong update resi ya", receivedAt: "2026-06-06T02:20:00.000Z" },
  ],
  reviews: [
    { reviewId: "RV-301", channel: "lazada", sku: "PC-IP15-CLR", productName: "Phone Case", rating: 1, text: "Wrong SKU. Ordered iPhone 15 clear, got iPhone 14 Pro case.", createdAt: "2026-06-05T09:00:00.000Z" },
    { reviewId: "RV-302", channel: "lazada", sku: "PC-IP15-CLR", productName: "Phone Case", rating: 2, text: "Salah barang, lubang camera tidak ngam.", createdAt: "2026-06-05T10:10:00.000Z" },
    { reviewId: "RV-303", channel: "shopee", sku: "PC-IP15-CLR", productName: "Phone Case", rating: 1, text: "Packaging says IP15 but actual casing is IP14P.", createdAt: "2026-06-05T11:25:00.000Z" },
  ],
  courierTracking: [
    { trackingId: "JT-9001", orderId: "SHP-WE-001", courier: "J&T Express", region: "Selangor", promisedDays: 3, actualDays: 6, status: "stuck_at_hub" },
    { trackingId: "JT-9002", orderId: "LZD-PC-201", courier: "J&T Express", region: "Selangor", promisedDays: 3, actualDays: 7, status: "failed_delivery_attempt" },
    { trackingId: "JT-9003", orderId: "LZD-PC-202", courier: "J&T Express", region: "Selangor", promisedDays: 3, actualDays: 6, status: "stuck_at_hub" },
    { trackingId: "JT-9004", orderId: "TTS-DL-701", courier: "J&T Express", region: "Selangor", promisedDays: 3, actualDays: 6, status: "linehaul_delay" },
  ],
  adPerformance: [
    { campaignId: "TT-ADS-77", channel: "ads", campaignName: "TikTok Payday Desk Lamp MY Broad", sku: "DL-WHT-MY", productName: "Desk Lamp", spend: 420, clicks: 860, conversions: 2, roas: 0.32, stockOnHand: 7 },
    { campaignId: "SHP-ADS-21", channel: "ads", campaignName: "Shopee Earbuds Always On", sku: "WE-BLK-SEA", productName: "Wireless Earbuds", spend: 120, clicks: 210, conversions: 19, roas: 4.8, stockOnHand: 18 },
  ],
};

export const afterActions = {
  stockout_risk: { daysOfCoverBefore: 1.1, daysOfCoverAfter: 5.8, note: "Reorder recommendation and listing flag reduced oversell risk." },
  wrong_sku_complaint: { complaintRateBefore: 0.18, complaintRateAfter: 0.05, note: "Internal pick-pack task and buyer reply draft reduced repeat complaints." },
  late_delivery_spike: { lateRateBefore: 0.67, lateRateAfter: 0.28, note: "Affected orders tagged and proactive buyer update prepared." },
  ad_waste: { roasBefore: 0.32, roasAfter: 1.15, note: "Budget-change recommendation prevents spend on low-stock low-conversion traffic." },
  message_backlog: { unansweredBefore: 6, unansweredAfter: 1, note: "Messages classified and reply drafts prepared for merchant review." },
} as const;
