import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/auth/session";
import { computeExecutionScore } from "@/lib/engines/executionScore";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const days = Number(req.nextUrl.searchParams.get("days") ?? 30);
    const score = await computeExecutionScore(user.id, Number.isFinite(days) ? days : 30);
    return NextResponse.json({ score });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
