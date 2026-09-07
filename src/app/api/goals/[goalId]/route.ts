import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth/session";
import { canAccessOwnedResource, type Role } from "@/lib/permissions/rbac";
import { z } from "zod";

async function loadGoal(goalId: string) {
  return queryOne<{ id: string; user_id: string; [k: string]: unknown }>(
    `select * from goals where id = $1`,
    [goalId]
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const user = await requireUser();
    const { goalId } = await params;
    const goal = await loadGoal(goalId);
    if (!goal) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (!canAccessOwnedResource(user.role as Role, goal.user_id, user.id)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    return NextResponse.json({ goal });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}

const updateGoalSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  why: z.string().optional(),
  desiredResult: z.string().optional(),
  currentState: z.string().optional(),
  targetState: z.string().optional(),
  deadline: z.string().optional(),
  availableTime: z.string().optional(),
  experience: z.string().optional(),
  resources: z.string().optional(),
  constraints: z.string().optional(),
  risks: z.string().optional(),
  blockers: z.string().optional(),
  strategy: z.string().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ABANDONED"]).optional(),
});

const FIELD_MAP: Record<string, string> = {
  title: "title",
  why: "why",
  desiredResult: "desired_result",
  currentState: "current_state",
  targetState: "target_state",
  deadline: "deadline",
  availableTime: "available_time",
  experience: "experience",
  resources: "resources",
  constraints: "constraints",
  risks: "risks",
  blockers: "blockers",
  strategy: "strategy",
  priority: "priority",
  status: "status",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const user = await requireUser();
    const { goalId } = await params;
    const goal = await loadGoal(goalId);
    if (!goal) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (!canAccessOwnedResource(user.role as Role, goal.user_id, user.id)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = updateGoalSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const entries = Object.entries(parsed.data).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return NextResponse.json({ ok: true });

    const setClauses = entries.map(([k], i) => `${FIELD_MAP[k]} = $${i + 2}`);
    const values = entries.map(([, v]) => v);

    await query(`update goals set ${setClauses.join(", ")} where id = $1`, [goalId, ...values]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const user = await requireUser();
    const { goalId } = await params;
    const goal = await loadGoal(goalId);
    if (!goal) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (!canAccessOwnedResource(user.role as Role, goal.user_id, user.id)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    // Soft delete via status rather than physical delete, preserving history
    // for any tasks/reviews/reminders already linked to this goal.
    await query(`update goals set status = 'ABANDONED' where id = $1`, [goalId]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
