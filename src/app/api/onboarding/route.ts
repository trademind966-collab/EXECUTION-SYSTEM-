import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth/session";
import { ONBOARDING_QUESTIONS } from "@/lib/engines/onboardingQuestions";
import { z } from "zod";

export async function GET() {
  try {
    const user = await requireUser();
    const answers = await query<{ question_key: string; answer_text: string }>(
      `select question_key, answer_text from onboarding_answers where user_id = $1`,
      [user.id]
    );
    return NextResponse.json({ questions: ONBOARDING_QUESTIONS, answers });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}

const answerSchema = z.object({
  questionKey: z.string(),
  answerText: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = answerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid answer." }, { status: 400 });

    const question = ONBOARDING_QUESTIONS.find((q) => q.key === parsed.data.questionKey);
    if (!question) return NextResponse.json({ error: "Unknown question." }, { status: 400 });

    await query(
      `insert into onboarding_answers (user_id, question_key, answer_text)
       values ($1,$2,$3)
       on conflict (user_id, question_key) do update set answer_text = excluded.answer_text`,
      [user.id, parsed.data.questionKey, parsed.data.answerText]
    );

    if (parsed.data.questionKey === "ACCOUNTABILITY_STYLE") {
      await query(`update users set accountability_style = $2 where id = $1`, [
        user.id,
        parsed.data.answerText,
      ]);
    }

    const answered = await queryOne<{ count: string }>(
      `select count(*) from onboarding_answers where user_id = $1`,
      [user.id]
    );

    return NextResponse.json({
      ok: true,
      complete: Number(answered?.count ?? 0) >= ONBOARDING_QUESTIONS.length,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
