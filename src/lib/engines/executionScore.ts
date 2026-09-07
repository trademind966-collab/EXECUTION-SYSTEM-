import { query, queryOne } from "@/lib/db";

export interface ExecutionScore {
  completedVerified: number;
  due: number;
  rate: number; // 0..1
  formula: string;
}

/**
 * Execution Rate = completed & verified tasks / due tasks, over the given window.
 * Always returned with the formula and raw counts — never presented as an
 * opaque "score" (section 56).
 */
export async function computeExecutionScore(
  userId: string,
  sinceDays = 30
): Promise<ExecutionScore> {
  const row = await queryOne<{ completed: string; due: string }>(
    `select
       count(*) filter (where t.status = 'COMPLETED') as completed,
       count(*) filter (where t.due_date is not null and t.due_date <= current_date) as due
     from tasks t
     join goals g on g.id = t.goal_id
     where g.user_id = $1
       and t.created_at >= now() - ($2 || ' days')::interval`,
    [userId, sinceDays]
  );

  const completed = Number(row?.completed ?? 0);
  const due = Number(row?.due ?? 0);
  const rate = due > 0 ? completed / due : 0;

  return {
    completedVerified: completed,
    due,
    rate,
    formula: "Execution Rate = completed & verified tasks / due tasks",
  };
}

/**
 * Recomputes the user's personal execution profile from historical data.
 * Uses neutral vocabulary only (pattern / signal / blocker / risk /
 * improvement opportunity) — never a negative label about the person.
 */
export async function refreshExecutionProfile(userId: string): Promise<void> {
  const stats = await queryOne<{
    avg_minutes: string | null;
    completion_rate: string | null;
    top_blocker: string | null;
  }>(
    `with completed as (
       select estimated_minutes from tasks t
       join goals g on g.id = t.goal_id
       where g.user_id = $1 and t.status = 'COMPLETED'
     ),
     rates as (
       select
         count(*) filter (where t.status = 'COMPLETED')::numeric /
         nullif(count(*) filter (where t.status in ('COMPLETED','MISSED')), 0) as rate
       from tasks t join goals g on g.id = t.goal_id where g.user_id = $1
     ),
     blockers as (
       select mtr.reason, count(*) as c
       from missed_task_reasons mtr
       join tasks t on t.id = mtr.task_id
       join goals g on g.id = t.goal_id
       where g.user_id = $1
       group by mtr.reason
       order by c desc
       limit 1
     )
     select
       (select avg(estimated_minutes)::text from completed) as avg_minutes,
       (select rate::text from rates) as completion_rate,
       (select reason from blockers) as top_blocker`,
    [userId]
  );

  await query(
    `insert into personal_execution_profiles
       (user_id, avg_task_completion_minutes, completion_rate, typical_blocker, updated_at)
     values ($1, $2, $3, $4, now())
     on conflict (user_id) do update set
       avg_task_completion_minutes = excluded.avg_task_completion_minutes,
       completion_rate = excluded.completion_rate,
       typical_blocker = excluded.typical_blocker,
       updated_at = now()`,
    [
      userId,
      stats?.avg_minutes ? Number(stats.avg_minutes) : null,
      stats?.completion_rate ? Number(stats.completion_rate) : null,
      stats?.top_blocker ?? null,
    ]
  );
}
