import { query, queryOne, withTransaction } from "@/lib/db";

const PATTERN_THRESHOLD = 3;

/**
 * Looks at the user's recent missed tasks. If the same reason/category
 * repeats >= PATTERN_THRESHOLD times, records (or bumps) a `patterns` row
 * and returns it so the caller can surface the "we've seen this pattern"
 * prompt (section 13). Never labels the user — only the pattern.
 */
export async function detectRepeatedFailure(userId: string) {
  const recentMisses = await query<{ reason: string; task_id: string }>(
    `select mtr.reason, mtr.task_id
     from missed_task_reasons mtr
     join tasks t on t.id = mtr.task_id
     join goals g on g.id = t.goal_id
     where g.user_id = $1
     order by mtr.created_at desc
     limit 10`,
    [userId]
  );

  const counts = new Map<string, number>();
  for (const row of recentMisses) {
    counts.set(row.reason, (counts.get(row.reason) ?? 0) + 1);
  }

  const detected: { reason: string; count: number }[] = [];

  for (const [reason, count] of counts.entries()) {
    if (count >= PATTERN_THRESHOLD) {
      detected.push({ reason, count });
      await upsertPattern(userId, reason, count);
    }
  }

  return detected;
}

async function upsertPattern(userId: string, reason: string, count: number) {
  const existing = await queryOne<{ id: string }>(
    `select id from patterns where user_id = $1 and pattern_type = 'REPEATED_MISS' and blocker = $2 and status = 'OPEN'`,
    [userId, reason]
  );

  if (existing) {
    await query(
      `update patterns set occurrence_count = $2, last_detected_at = now() where id = $1`,
      [existing.id, count]
    );
  } else {
    await query(
      `insert into patterns (user_id, pattern_type, blocker, description, occurrence_count)
       values ($1, 'REPEATED_MISS', $2, $3, $4)`,
      [
        userId,
        reason,
        `Missed tasks repeatedly cite "${reason}" as the reason.`,
        count,
      ]
    );
  }
}

export function patternPrompt(reason: string, count: number): string {
  return `We've seen this pattern ${count} times ("${reason.toLowerCase().replaceAll("_", " ")}"). Do you think the problem is the task, the timing, the strategy, or something else?`;
}

export async function acknowledgePattern(patternId: string, status: "ACKNOWLEDGED" | "RESOLVED") {
  await query(`update patterns set status = $2 where id = $1`, [patternId, status]);
}

/** Escalate an unresolved pattern to human review (section 54). */
export async function escalatePattern(userId: string, patternId: string, notes?: string) {
  return withTransaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `insert into escalations (user_id, pattern_id, notes) values ($1, $2, $3) returning id`,
      [userId, patternId, notes ?? null]
    );
    await client.query(`update patterns set status = 'ACKNOWLEDGED' where id = $1`, [patternId]);
    return result.rows[0].id;
  });
}
