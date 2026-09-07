import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/auth/session";
import { assertTaskAccess } from "@/lib/engines/taskAccess";
import { recordMissedTask, followUpQuestionFor, type MissedReason } from "@/lib/engines/taskEngine";
import { detectRepeatedFailure, patternPrompt } from "@/lib/engines/patternDetection";
import type { Role } from "@/lib/permissions/rbac";
import { z } from "zod";

const REASONS = [
  "TASK_UNCLEAR",
  "TASK_TOO_LARGE",
  "NO_TIME",
  "FORGOT",
  "LOST_MOTIVATION",
  "WRONG_PRIORITY",
  "UNEXPECTED_SITUATION",
  "DID_NOT_KNOW_HOW",
  "INFORMATION_MISSING",
  "OTHER",
] as const;

const schema = z.object({
  reason: z.enum(REASONS),
  followUpAnswer: z.string().optional(),
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
    if (!parsed.success) return NextResponse.json({ error: "A reason is required." }, { status: 400 });

    await recordMissedTask(taskId, parsed.data.reason as MissedReason, parsed.data.followUpAnswer);

    const patterns = await detectRepeatedFailure(user.id);
    const followUpQuestion = followUpQuestionFor(parsed.data.reason as MissedReason);

    return NextResponse.json({
      ok: true,
      followUpQuestion,
      patternsDetected: patterns.map((p) => ({
        reason: p.reason,
        count: p.count,
        prompt: patternPrompt(p.reason, p.count),
      })),
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
