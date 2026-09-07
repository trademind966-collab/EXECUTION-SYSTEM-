import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth/session";
import { canAccessOwnedResource, type Role } from "@/lib/permissions/rbac";
import { z } from "zod";

async function assertAccess(roadmapId: string, userId: string, role: Role) {
  const roadmap = await queryOne<{ id: string; goal_id: string }>(
    `select id, goal_id from roadmaps where id = $1`,
    [roadmapId]
  );
  if (!roadmap) return null;
  const goal = await queryOne<{ user_id: string }>(`select user_id from goals where id = $1`, [
    roadmap.goal_id,
  ]);
  if (!goal || !canAccessOwnedResource(role, goal.user_id, userId)) return null;
  return roadmap;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roadmapId: string }> }
) {
  try {
    const user = await requireUser();
    const { roadmapId } = await params;
    const roadmap = await assertAccess(roadmapId, user.id, user.role as Role);
    if (!roadmap) return NextResponse.json({ error: "Not found or forbidden." }, { status: 404 });

    const tasks = await query(
      `select * from tasks where roadmap_id = $1 order by day_number asc, priority asc`,
      [roadmapId]
    );
    return NextResponse.json({ tasks });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}

const editTaskSchema = z.object({
  taskId: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  estimatedMinutes: z.number().int().min(1).max(600).optional(),
  dueDate: z.string().optional(),
  priority: z.number().int().min(1).max(5).optional(),
});

/** User edits a task before/after approval — section 2: user owns the plan. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roadmapId: string }> }
) {
  try {
    const user = await requireUser();
    const { roadmapId } = await params;
    const roadmap = await assertAccess(roadmapId, user.id, user.role as Role);
    if (!roadmap) return NextResponse.json({ error: "Not found or forbidden." }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = editTaskSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { taskId, ...rest } = parsed.data;
    const fieldMap: Record<string, string> = {
      title: "title",
      description: "description",
      estimatedMinutes: "estimated_minutes",
      dueDate: "due_date",
      priority: "priority",
    };
    const entries = Object.entries(rest).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return NextResponse.json({ ok: true });

    const setClauses = entries.map(([k], i) => `${fieldMap[k]} = $${i + 2}`);
    const values = entries.map(([, v]) => v);

    await query(
      `update tasks set ${setClauses.join(", ")} where id = $1 and roadmap_id = $${entries.length + 2}`,
      [taskId, ...values, roadmapId]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
