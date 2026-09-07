import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/auth/session";
import { assertTaskAccess } from "@/lib/engines/taskAccess";
import { completeTask } from "@/lib/engines/taskEngine";
import { refreshExecutionProfile } from "@/lib/engines/executionScore";
import type { Role } from "@/lib/permissions/rbac";
import { z } from "zod";

const schema = z.object({
  // "What exactly did you complete? What did you do? What changed?"
  verificationNote: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await requireUser();
    const { taskId } = await params;
    const task = await assertTaskAccess(taskId, user.id, user.role as Role);
    if (!task) return NextResponse.json({ error: "Not found or forbidden." }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Tell us what exactly you completed, what you did, and what changed." },
        { status: 400 }
      );
    }

    await completeTask(taskId, parsed.data.verificationNote);
    await refreshExecutionProfile(user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
