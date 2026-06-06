import { runAgentScan } from "@sea-ops/core";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(await runAgentScan());
}
