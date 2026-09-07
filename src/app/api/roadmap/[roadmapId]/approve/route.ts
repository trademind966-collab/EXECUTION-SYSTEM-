import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth/session";
import { canAccessOwnedResource, type Role } from "@/lib/permissions/rbac";
import { approveRoadmap } from "@/lib/engines/taskEngine";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ roadmapId: string }> }
) {
  try {
    const user = await requireUser();
    const { roadmapId } = await params;

    const roadmap = await queryOne<{ id: string; goal_id: string }>(
      `select id, goal_id from roadmaps where id = $1`,
      [roadmapId]
    );
    if (!roadmap) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const goal = await queryOne<{ user_id: string }>(`select user_id from goals where id = $1`, [
      roadmap.goal_id,
    ]);
    if (!goal || !canAccessOwnedResource(user.role as Role, goal.user_id, user.id)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    await approveRoadmap(roadmapId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
