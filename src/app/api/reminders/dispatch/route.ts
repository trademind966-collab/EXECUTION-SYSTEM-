import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { dispatchReminder, type ReminderChannel } from "@/lib/notifications/channels";

/**
 * Sends all PENDING reminders whose scheduled_at has passed. Designed to be
 * invoked by an external scheduler (cron, Vercel Cron, Supabase Edge
 * Function cron, etc.) hitting this route with a shared secret header —
 * see CRON_SECRET in .env.example and docs/DEPLOYMENT.md.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const due = await query<{
    id: string;
    user_id: string;
    channel: ReminderChannel;
    message: string;
    email: string;
  }>(
    `select r.id, r.user_id, r.channel, r.message, u.email
     from reminders r
     join users u on u.id = r.user_id
     where r.status = 'PENDING' and r.scheduled_at <= now()
     limit 200`
  );

  let sent = 0;
  let failed = 0;

  for (const reminder of due) {
    try {
      const result = await dispatchReminder({
        channel: reminder.channel,
        to: { email: reminder.email },
        message: reminder.message,
      });
      await query(
        `update reminders set status = $2, sent_at = case when $2 = 'SENT' then now() else sent_at end where id = $1`,
        [reminder.id, result.delivered ? "SENT" : "FAILED"]
      );
      if (result.delivered) sent += 1;
      else failed += 1;
    } catch (err) {
      console.error("Reminder dispatch failed", reminder.id, err);
      await query(`update reminders set status = 'FAILED' where id = $1`, [reminder.id]);
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, processed: due.length, sent, failed });
}
