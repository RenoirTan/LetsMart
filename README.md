# SEA Marketplace Operations Agent

Hackathon monorepo for a Southeast Asia-native autonomous marketplace operations layer. The demo detects fragmented marketplace exceptions, diagnoses likely causes, applies local risk guardrails, simulates safe tool execution, routes risky actions for approval, verifies outcomes, and captures merchant feedback.

## Quick Start

Install dependencies:

```bash
corepack pnpm install
```

## OpenAI Configuration

Create or update `apps/web/.env.local`:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
```

Do not use `NEXT_PUBLIC_OPENAI_API_KEY`; that would expose the key to the browser.

After changing `.env.local`, restart the web server:

```bash
corepack pnpm dev
```

Start all simulated platform servers in one terminal:

```bash
corepack pnpm dev:simulators
```

Start the web app and central API server in another terminal:

```bash
corepack pnpm dev
```

Open `http://localhost:3000`, then click `Run Agent Scan`.

## Simulated Server Pages

Each simulated platform server exposes a browser-readable state page:

```text
http://localhost:5101  shopee-inventory-server
http://localhost:5102  tiktok-sku-server
http://localhost:5103  courier-delay-server
http://localhost:5104  ads-waste-server
http://localhost:5105  whatsapp-backlog-server
http://localhost:5106  competitor-watch-server
http://localhost:5107  trend-watch-server
http://localhost:5108  supplier-delay-server
```

On Linux, open all simulator pages with:

```bash
for port in 5101 5102 5103 5104 5105 5106 5107 5108; do xdg-open "http://localhost:$port"; done
```

Simulator, worker, and tool-forwarding logs are enabled by default. To disable them:

```bash
SIMULATOR_LOGS=0 corepack pnpm dev:simulators
```

## Workspace

- `apps/web` - Next.js dashboard and API routes.
- `apps/simulated-platforms` - Local simulated marketplace, courier, supplier, ads, and buyer-message servers.
- `packages/schemas` - Shared TypeScript and Zod schemas.
- `packages/mock-data` - Scenario fixtures and operational mock data.
- `packages/workers` - Signal workers that emit marketplace events.
- `packages/agents` - Deterministic agent workflow and prompt templates.
- `packages/tools` - Simulated business action tools.
- `packages/core` - Orchestration, state, risk policy, and API helpers.
- `packages/simulated-server` - Shared in-memory HTTP simulator runtime.
- `docs/team-prompts` - Team prompts from the project plan.

## Demo Flow

1. Run an agent scan from the command center.
2. Review detected issues across Shopee, Lazada, TikTok Shop, WhatsApp, couriers, suppliers, and ads.
3. Open an issue to inspect evidence, reasoning, proposed actions, tool logs, verification, and feedback.
4. Approve or reject risky actions from the approval queue.
5. Verify outcomes and reset the demo for another run.
