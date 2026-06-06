import { rejectAction } from "@sea-ops/core";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const action = rejectAction(params.id, body.merchantNote);
  if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });
  return NextResponse.json(action);
}
