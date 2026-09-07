import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/auth/session";
import { getFollowUpQuestions } from "@/lib/engines/questionEngine";
import { z } from "zod";

const schema = z.object({
  previousAnswer: z.string().min(1),
  goalTitle: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "previousAnswer is required." }, { status: 400 });

    const questions = await getFollowUpQuestions(parsed.data);
    return NextResponse.json({ questions });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
