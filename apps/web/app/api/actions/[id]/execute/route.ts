import { executeAction } from "@sea-ops/core";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const log = executeAction(params.id);
  if (!log) return NextResponse.json({ error: "Action not executable" }, { status: 404 });
  return NextResponse.json(log);
}
