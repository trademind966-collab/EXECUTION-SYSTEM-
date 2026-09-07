import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth/session";
import { z } from "zod";

export async function GET() {
  try {
    const user = await requireUser();
    const reminders = await query(
      `select * from reminders where user_id = $1 order by scheduled_at desc limit 50`,
      [user.id]
    );
    return NextResponse.json({ reminders });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}

const schema = z.object({
  taskId: z.string().optional(),
  channel: z.enum(["IN_APP", "PUSH", "EMAIL", "WHATSAPP", "SMS"]),
  reminderType: z.enum([
    "TASK_REMINDER",
    "UPCOMING_DEADLINE",
    "MISSED_TASK",
    "PATTERN_REMINDER",
    "WEEKLY_REVIEW",
    "THIRTY_DAY_REVIEW",
    "GOAL_REMINDER",
  ]),
  message: z.string().min(1),
  scheduledAt: z.string(), // ISO datetime
});

/** Schedules a reminder (does not send it immediately — see /api/reminders/dispatch). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const [row] = await query<{ id: string }>(
      `insert into reminders (user_id, task_id, channel, reminder_type, message, scheduled_at)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [
        user.id,
        parsed.data.taskId ?? null,
        parsed.data.channel,
        parsed.data.reminderType,
        parsed.data.message,
        parsed.data.scheduledAt,
      ]
    );

    return NextResponse.json({ ok: true, reminderId: row.id }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
