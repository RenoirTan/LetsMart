# Member 2 Merge Context

This file is the merge handoff for Member 2's work on the SEA Marketplace Operations Agent hackathon project. Read this before merging with Member 1 frontend, Member 3 workers/agent flow, or Member 4 backend/API state work.

## Member 2 Scope

Member 2 owns mock data, scenario design, CSV/JSON fixtures, SEA marketplace realism, expected worker outputs, and verification metrics.

The completed work is intentionally fixture-first:

- Raw operational signals are in `packages/mock-data/sources`.
- Scenario-level JSON fixtures are in `packages/mock-data/scenarios`.
- Runtime demo data is exported from `packages/mock-data/src/index.ts`.
- Worker expected outputs are captured in `packages/mock-data/scenarios/expected-events.json`.
- Before/after verification data is captured in `packages/mock-data/scenarios/after-actions.json`.
- Fixture shape documentation is in `packages/mock-data/FIXTURE_SHAPE.md`.

## Files Added

Added raw source CSVs:

- `packages/mock-data/sources/orders.csv`
- `packages/mock-data/sources/inventory.csv`
- `packages/mock-data/sources/customer_messages.csv`
- `packages/mock-data/sources/reviews.csv`
- `packages/mock-data/sources/supplier_emails.csv`
- `packages/mock-data/sources/ad_performance.csv`
- `packages/mock-data/sources/courier_tracking.csv`
- `packages/mock-data/sources/price_history.csv`
- `packages/mock-data/sources/competitor_snapshots.csv`
- `packages/mock-data/sources/marketplace_listings.csv`

Added top-level scenario JSON fixtures:

- `packages/mock-data/scenarios/stockout-risk.json`
- `packages/mock-data/scenarios/wrong-sku-complaints.json`
- `packages/mock-data/scenarios/late-delivery-spike.json`
- `packages/mock-data/scenarios/ad-waste.json`
- `packages/mock-data/scenarios/message-backlog.json`
- `packages/mock-data/scenarios/price-change.json`
- `packages/mock-data/scenarios/competitor-action.json`
- `packages/mock-data/scenarios/supplier-delay.json`
- `packages/mock-data/scenarios/listing-health.json`
- `packages/mock-data/scenarios/expected-events.json`
- `packages/mock-data/scenarios/after-actions.json`

Added handoff documentation:

- `packages/mock-data/FIXTURE_SHAPE.md`
- `MEMBER_2_MERGE_CONTEXT.md`

## Files Modified

Modified fixture exports:

- `packages/mock-data/src/index.ts`

Modified existing per-scenario fixture folders so they match the canonical data:

- `packages/mock-data/scenarios/stockout-risk/*`
- `packages/mock-data/scenarios/wrong-sku/*`
- `packages/mock-data/scenarios/late-delivery/*`
- `packages/mock-data/scenarios/ad-waste/*`
- `packages/mock-data/scenarios/message-backlog/*`
- `packages/mock-data/scenarios/shared/*`

Modified worker/agent alignment:

- `packages/workers/src/index.ts`
- `packages/agents/src/index.ts`

The worker/agent changes are small but important. Do not drop them casually during merge:

- `ReviewThemeWorker` now computes `averageRating` from review rows instead of hardcoding it.
- `AdWasteWorker` now emits `unavailableVariantFlag` when stock is `0`.
- `wrong_sku_complaint` proposed actions now include `pause_fulfilment`, which is medium risk and approval-gated.
- `ad_waste` proposed actions now include `pause_ad_campaign`, which is high risk and approval-gated.
- Verification copy/metrics now match the updated fixture numbers.

## Canonical Demo Numbers

These are the numbers the merged demo should preserve:

| Event type | Canonical metric |
| --- | --- |
| `stockout_risk` | Wireless Earbuds has `12` units left, `63` units sold over 7 days, `9/day` velocity, `1.3` days of cover |
| `wrong_sku_complaint` | Phone Case has `5` wrong-SKU complaint reviews, average rating `1.4` |
| `late_delivery_spike` | J&T Express has `17` delayed orders in Selangor/Klang Valley |
| `ad_waste` | TikTok Desk Lamp campaign spent `MYR 680`, ROAS is `0.29`, white variant stock is `0`, `unavailableVariantFlag` is `true` |
| `message_backlog` | WhatsApp/Instagram backlog has `23` unanswered buyer messages |

Stretch scenarios are represented in fixtures but may need Member 3 worker implementation:

- `price_change`
- `competitor_action`
- `supplier_delay`
- `listing_health`

## Runtime Data Shape

`packages/mock-data/src/index.ts` exports:

- `InventoryRow`
- `OrderRow`
- `MessageRow`
- `ReviewRow`
- `CourierTrackingRow`
- `AdPerformanceRow`
- `SupplierEmailRow`
- `PriceHistoryRow`
- `CompetitorSnapshotRow`
- `MarketplaceListingRow`
- `DemoData`
- `demoData`
- `afterActions`

The `DemoData` interface now includes these arrays:

```ts
interface DemoData {
  inventory: InventoryRow[];
  orders: OrderRow[];
  messages: MessageRow[];
  reviews: ReviewRow[];
  courierTracking: CourierTrackingRow[];
  adPerformance: AdPerformanceRow[];
  supplierEmails: SupplierEmailRow[];
  priceHistory: PriceHistoryRow[];
  competitorSnapshots: CompetitorSnapshotRow[];
  marketplaceListings: MarketplaceListingRow[];
}
```

If Member 3 adds real workers for the stretch scenarios, prefer consuming these existing arrays instead of inventing parallel fixture state.

## Expected Worker Event Shape

`packages/mock-data/scenarios/expected-events.json` mirrors `MarketplaceEvent` from `packages/schemas`, except it omits runtime-generated fields:

- `id`
- `detectedAt`

Use it as the integration contract for workers.

Expected worker names:

- `InventoryVelocityWorker` emits `stockout_risk`
- `ReviewThemeWorker` emits `wrong_sku_complaint`
- `CourierDelayWorker` emits `late_delivery_spike`
- `AdWasteWorker` emits `ad_waste`
- `MessageBacklogWorker` emits `message_backlog`
- `PriceChangeWorker` should emit `price_change`
- `CompetitorActionWorker` should emit `competitor_action`
- `SupplierDelayWorker` should emit `supplier_delay`
- `ListingHealthWorker` should emit `listing_health`

## Integration Notes For Other Members

Member 1 frontend:

- Use scenario evidence from `MarketplaceEvent.evidence` and scenario `rawSignals`.
- Verification panels should display `afterActions` or agent verification results.
- The most visually useful evidence records are:
- `inventory.csv:WE-BLK-SEA`
- `reviews.csv:RV-301..RV-305`
- `courier_tracking.csv:JT-KV-001..JT-KV-017`
- `ad_performance.csv:TT-ADS-77`
- `customer_messages.csv:WA-001..WA-019,IG-001..IG-004`

Member 3 workers/agents:

- Keep the five MVP workers compatible with the canonical metrics above.
- Implement stretch workers from the new `DemoData` arrays if time allows.
- If worker output conflicts with `expected-events.json`, update either the worker or expected event deliberately. Do not leave them diverged.

Member 4 backend/API:

- Seed/reset should preserve `demoData` as the baseline scenario state.
- Approval/reset behavior should not mutate fixture files directly.
- If backend loads CSV/JSON files instead of TypeScript exports, use `packages/mock-data/sources` and `packages/mock-data/scenarios` as the source of truth.

## Risk Policy Alignment

Safe actions can auto-run:

- `summarize_issue`
- `tag_order`
- `create_internal_task`
- `draft_buyer_reply`
- `draft_supplier_email`
- `classify_message`
- `flag_stockout`

Medium-risk actions require approval:

- `send_buyer_message`
- `update_order_status`
- `contact_supplier`
- `pause_fulfilment`
- `update_listing_text`
- `send_bulk_customer_update`

High-risk actions require approval:

- `issue_refund`
- `cancel_order`
- `change_price`
- `reorder_inventory`
- `change_ad_budget`
- `pause_ad_campaign`
- `modify_listing_availability`

The Member 2 fixtures intentionally demonstrate this policy:

- Stockout reorder is high risk.
- Wrong-SKU fulfilment pause is medium risk.
- Late-delivery bulk update is medium risk.
- Ad budget/campaign pause is high risk.
- Message drafts are safe, sending is medium risk.

## Verification Commands

After merging all members, run:

```powershell
corepack pnpm install
corepack pnpm -r typecheck
```

Then run the app and click `Run Agent Scan`. The scan should produce at least the five MVP issues:

- `issue-stockout_risk`
- `issue-wrong_sku_complaint`
- `issue-late_delivery_spike`
- `issue-ad_waste`
- `issue-message_backlog`

If Member 3 implements stretch workers, it may also produce:

- `issue-price_change`
- `issue-competitor_action`
- `issue-supplier_delay`
- `issue-listing_health`

## Merge Conflict Guidance

Prefer preserving:

- Member 2's expanded `DemoData` interface.
- Member 2's canonical MVP metric values.
- Member 2's `sources` CSV directory.
- Member 2's top-level scenario JSON files.
- Member 2's `expected-events.json` and `after-actions.json`.
- Worker changes that make emitted metrics match expected events.
- Agent changes that add approval-gated `pause_fulfilment` and `pause_ad_campaign`.

Likely conflict files:

- `packages/mock-data/src/index.ts`
- `packages/workers/src/index.ts`
- `packages/agents/src/index.ts`
- `packages/core/src/index.ts`

If another member changed the same files, merge by behavior:

- Keep all useful worker implementations.
- Keep the richer Member 2 fixture shape.
- Make worker outputs match `expected-events.json`.
- Make action risk levels match the shared risk policy.
- Make verification display the same before/after story as `after-actions.json`.

Do not preserve generated `tsconfig.tsbuildinfo` changes from typechecking unless the team intentionally tracks those build artifacts.
