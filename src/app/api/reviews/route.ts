import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth/session";
import { computeExecutionScore } from "@/lib/engines/executionScore";
import { z } from "zod";

const schema = z.object({
  goalId: z.string().optional(),
  reviewType: z.enum(["WEEKLY", "THIRTY_DAY"]),
  strategyWorked: z.boolean().optional(),
  whatWorked: z.string().optional(),
  whatFailed: z.string().optional(),
  assumptionCorrect: z.string().optional(),
  assumptionWrong: z.string().optional(),
  whatChanged: z.string().optional(),
  nextTest: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const windowDays = parsed.data.reviewType === "WEEKLY" ? 7 : 30;
    const score = await computeExecutionScore(user.id, windowDays);

    const [row] = await query<{ id: string }>(
      `insert into reviews
         (user_id, goal_id, review_type, strategy_worked, what_worked, what_failed,
          assumption_correct, assumption_wrong, what_changed, next_test, execution_rate)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       returning id`,
      [
        user.id,
        parsed.data.goalId ?? null,
        parsed.data.reviewType,
        parsed.data.strategyWorked ?? null,
        parsed.data.whatWorked ?? null,
        parsed.data.whatFailed ?? null,
        parsed.data.assumptionCorrect ?? null,
        parsed.data.assumptionWrong ?? null,
        parsed.data.whatChanged ?? null,
        parsed.data.nextTest ?? null,
        score.rate,
      ]
    );

    return NextResponse.json({ ok: true, reviewId: row.id, executionScore: score }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const goalId = req.nextUrl.searchParams.get("goalId");
    const reviews = goalId
      ? await query(`select * from reviews where user_id = $1 and goal_id = $2 order by created_at desc`, [
          user.id,
          goalId,
        ])
      : await query(`select * from reviews where user_id = $1 order by created_at desc`, [user.id]);
    return NextResponse.json({ reviews });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
