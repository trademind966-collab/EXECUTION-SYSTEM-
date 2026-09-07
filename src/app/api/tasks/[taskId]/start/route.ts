import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/auth/session";
import { assertTaskAccess } from "@/lib/engines/taskAccess";
import { startTask } from "@/lib/engines/taskEngine";
import type { Role } from "@/lib/permissions/rbac";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await requireUser();
    const { taskId } = await params;
    const task = await assertTaskAccess(taskId, user.id, user.role as Role);
    if (!task) return NextResponse.json({ error: "Not found or forbidden." }, { status: 404 });

    await startTask(taskId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
