import { verifyIssue } from "@sea-ops/core";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const verification = await verifyIssue(params.id);
  if (!verification) return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  return NextResponse.json(verification);
}
