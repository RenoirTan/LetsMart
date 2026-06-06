import { executeAction, getActionExecutionBlocker } from "@sea-ops/core";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const log = await executeAction(params.id);
  if (!log) {
    const reason = getActionExecutionBlocker(params.id) ?? "action_not_executable";
    return NextResponse.json({ error: reason }, { status: reason === "action_not_approved" ? 409 : 404 });
  }
  return NextResponse.json(log);
}
