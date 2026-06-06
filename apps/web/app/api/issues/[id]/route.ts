import { getIssueDetail } from "@sea-ops/core";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const detail = getIssueDetail(params.id);
  if (!detail) return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  return NextResponse.json(detail);
}
