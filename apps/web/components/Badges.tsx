import type { Channel, IssueStatus, RiskLevel, Severity } from "@sea-ops/schemas";

const channelNames: Record<Channel, string> = {
  shopee: "Shopee",
  lazada: "Lazada",
  tiktok_shop: "TikTok Shop",
  whatsapp: "WhatsApp",
  instagram_dm: "Instagram DM",
  google_sheets: "Google Sheets",
  supplier_email: "Supplier Email",
  courier: "Courier",
  ads: "Ads",
};

export function ChannelBadge({ channel }: { channel: Channel }) {
  return <span className="badge channel">{channelNames[channel]}</span>;
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return <span className={`badge ${risk}`}>{risk.toUpperCase()} RISK</span>;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge ${severity}`}>{severity.toUpperCase()} SEVERITY</span>;
}

export function StatusBadge({ status }: { status: IssueStatus | string }) {
  return <span className={`badge ${status}`}>{status.replaceAll("_", " ").toUpperCase()}</span>;
}
