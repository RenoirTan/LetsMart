# SEA Marketplace Operations Agent

Hackathon monorepo for a Southeast Asia-native autonomous marketplace operations layer. The demo detects fragmented marketplace exceptions, diagnoses likely causes, applies local risk guardrails, simulates safe tool execution, routes risky actions for approval, verifies outcomes, and captures merchant feedback.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`, then click `Run Agent Scan`.

## Workspace

- `apps/web` - Next.js dashboard and API routes.
- `packages/schemas` - Shared TypeScript and Zod schemas.
- `packages/mock-data` - Scenario fixtures and operational mock data.
- `packages/workers` - Signal workers that emit marketplace events.
- `packages/agents` - Deterministic agent workflow and prompt templates.
- `packages/tools` - Simulated business action tools.
- `packages/core` - Orchestration, state, risk policy, and API helpers.
- `docs/team-prompts` - Team prompts from the project plan.

## Demo Flow

1. Run an agent scan from the command center.
2. Review detected issues across Shopee, Lazada, TikTok Shop, WhatsApp, couriers, suppliers, and ads.
3. Open an issue to inspect evidence, reasoning, proposed actions, tool logs, verification, and feedback.
4. Approve or reject risky actions from the approval queue.
5. Verify outcomes and reset the demo for another run.
