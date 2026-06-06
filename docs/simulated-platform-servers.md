# Simulated Platform Servers

This repo includes live local platform simulators for the demo. Each server loads seed data from code, stores mutable state in memory, exposes common read/write endpoints, and returns normalized events for workers.

## Start Servers

Start all simulated servers:

```bash
corepack pnpm dev:simulators
```

Simulator, worker, and tool-forwarding logs are enabled by default. To disable them:

```bash
SIMULATOR_LOGS=0 corepack pnpm dev:simulators
```

Start one server:

```bash
corepack pnpm dev:simulator shopee-inventory-server
```

The simulator uses Node's built-in HTTP runtime.

## Ports

```text
5101 shopee-inventory-server
5102 tiktok-sku-server
5103 courier-delay-server
5104 ads-waste-server
5105 whatsapp-backlog-server
5106 competitor-watch-server
5107 trend-watch-server
5108 supplier-delay-server
```

Each server has a small HTML state page at `/`, for example `http://localhost:5104/`.

## Common Endpoints

```text
GET  /health
GET  /state
GET  /snapshot
GET  /events
GET  /events?sinceVersion=12

GET    /collections
GET    /collections/:collectionName
POST   /collections/:collectionName
PATCH  /collections/:collectionName/:recordId
DELETE /collections/:collectionName/:recordId

POST /trigger
POST /apply-action
POST /reset
```

## Demo Commands

Trigger an issue:

```bash
curl -X POST http://localhost:5104/trigger \
  -H 'content-type: application/json' \
  -d '{"scenario":"default"}'
```

Read worker-compatible events:

```bash
curl http://localhost:5104/events
```

Expected simulator log:

```text
[simulator:ads-waste-server] GET /events -> 200 version=1->1 durationMs=3 events=1 issueTypes=ad_waste sinceVersion=0
```

Edit mock data:

```bash
curl -X PATCH http://localhost:5104/collections/campaigns/camp-desk-lamp \
  -H 'content-type: application/json' \
  -d '{"dailyBudget":200}'
```

Apply an approved action:

```bash
curl -X POST http://localhost:5104/apply-action \
  -H 'content-type: application/json' \
  -d '{
    "actionId":"action-1",
    "issueId":"issue-ad-waste",
    "actionType":"pause_ad_campaign",
    "approvedBy":"demo-merchant",
    "payload":{"campaignId":"camp-desk-lamp"}
  }'
```

Expected simulator log:

```text
[simulator:ads-waste-server] POST /apply-action -> 200 version=1->2 durationMs=5 action=pause_ad_campaign actionId=action-1 issueId=issue-ad-waste accepted=true summary="Paused simulated ad campaign Shopee 6.6 Desk Lamp Push."
```

Reset a server:

```bash
curl -X POST http://localhost:5104/reset
```
