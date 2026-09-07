import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth/session";
import { canAccessOwnedResource, type Role } from "@/lib/permissions/rbac";
import { generateRoadmap } from "@/lib/engines/roadmap";
import { persistRoadmap } from "@/lib/engines/taskEngine";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const goalId = body?.goalId as string | undefined;
    const gapAnalysisId = body?.gapAnalysisId as string | undefined;
    if (!goalId || !gapAnalysisId) {
      return NextResponse.json({ error: "goalId and gapAnalysisId are required." }, { status: 400 });
    }

    const goal = await queryOne<Record<string, unknown> & { user_id: string }>(
      `select * from goals where id = $1`,
      [goalId]
    );
    if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    if (!canAccessOwnedResource(user.role as Role, goal.user_id, user.id)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const gap = await queryOne<Record<string, unknown>>(
      `select * from gap_analyses where id = $1 and goal_id = $2`,
      [gapAnalysisId, goalId]
    );
    if (!gap) return NextResponse.json({ error: "Gap analysis not found for this goal." }, { status: 404 });

    const tasks = await generateRoadmap(
      {
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
      },
      {
        knowledgeGap: gap.knowledge_gap as string,
        skillGap: gap.skill_gap as string,
        resourceGap: gap.resource_gap as string,
        timeGap: gap.time_gap as string,
        executionGap: gap.execution_gap as string,
        consistencyGap: gap.consistency_gap as string,
        strategyGap: gap.strategy_gap as string,
        informationGap: gap.information_gap as string,
        environmentGap: gap.environment_gap as string,
        accountabilityGap: gap.accountability_gap as string,
        summary: gap.summary as string,
        generatedByAi: gap.generated_by_ai as boolean,
      }
    );

    const roadmapId = await persistRoadmap(goalId, gapAnalysisId, tasks);

    return NextResponse.json({ ok: true, roadmapId }, { status: 201 });
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

    const roadmaps = await query(
      `select * from roadmaps where goal_id = $1 order by created_at desc`,
      [goalId]
    );
    return NextResponse.json({ roadmaps });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
