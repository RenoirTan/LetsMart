import { addFeedback } from "@sea-ops/core";
import { merchantFeedbackSchema } from "@sea-ops/schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const parsed = merchantFeedbackSchema.omit({ issueId: true, createdAt: true }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const feedback = addFeedback(params.id, parsed.data);
  if (!feedback) return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  return NextResponse.json(feedback);
}
