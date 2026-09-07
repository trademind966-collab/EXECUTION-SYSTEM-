import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth/session";
import { canAccessOwnedResource, type Role } from "@/lib/permissions/rbac";
import { analyzeGap } from "@/lib/engines/gapAnalysis";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const goalId = body?.goalId as string | undefined;
    if (!goalId) return NextResponse.json({ error: "goalId is required." }, { status: 400 });

    const goal = await queryOne<Record<string, unknown> & { user_id: string }>(
      `select * from goals where id = $1`,
      [goalId]
    );
    if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    if (!canAccessOwnedResource(user.role as Role, goal.user_id, user.id)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const result = await analyzeGap({
      title: goal.title as string,
      why: goal.why as string | null,
      desiredResult: goal.desired_result as string | null,
      currentState: goal.current_state as string | null,
      targetState: goal.target_state as string | null,
      experience: goal.experience as string | null,
      resources: goal.resources as string | null,
      constraints: goal.constraints as string | null,
      blockers: goal.blockers as string | null,
      availableTime: goal.available_time as string | null,
    });

    const [row] = await query<{ id: string }>(
      `insert into gap_analyses
         (goal_id, knowledge_gap, skill_gap, resource_gap, time_gap, execution_gap,
          consistency_gap, strategy_gap, information_gap, environment_gap,
          accountability_gap, summary, generated_by_ai)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       returning id`,
      [
        goalId,
        result.knowledgeGap,
        result.skillGap,
        result.resourceGap,
        result.timeGap,
        result.executionGap,
        result.consistencyGap,
        result.strategyGap,
        result.informationGap,
        result.environmentGap,
        result.accountabilityGap,
        result.summary,
        result.generatedByAi,
      ]
    );

    return NextResponse.json({ ok: true, gapAnalysisId: row.id, result });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const goalId = req.nextUrl.searchParams.get("goalId");
    if (!goalId) return NextResponse.json({ error: "goalId query param required." }, { status: 400 });

    const goal = await queryOne<{ user_id: string }>(`select user_id from goals where id = $1`, [goalId]);
    if (!goal) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (!canAccessOwnedResource(user.role as Role, goal.user_id, user.id)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const analyses = await query(
      `select * from gap_analyses where goal_id = $1 order by created_at desc`,
      [goalId]
    );
    return NextResponse.json({ analyses });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
