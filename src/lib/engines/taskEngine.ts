import { withTransaction, query, queryOne } from "@/lib/db";
import type { GeneratedTask } from "./roadmap";

/**
 * Persists a generated roadmap as GENERATED (not yet active) with all tasks
 * LOCKED except those with no dependency, which become READY only once the
 * roadmap is approved (see approveRoadmap). This implements the approval
 * flow in section 57 of the spec: GENERATED -> USER REVIEWS -> EDIT -> APPROVE -> ACTIVE.
 */
export async function persistRoadmap(
  goalId: string,
  gapAnalysisId: string,
  tasks: GeneratedTask[]
): Promise<string> {
  return withTransaction(async (client) => {
    const roadmap = await client.query<{ id: string }>(
      `insert into roadmaps (goal_id, gap_analysis_id, status) values ($1, $2, 'GENERATED') returning id`,
      [goalId, gapAnalysisId]
    );
    const roadmapId = roadmap.rows[0].id;

    const insertedIds: string[] = [];
    for (const task of tasks) {
      const dependsOnId =
        task.dependsOnIndex !== null && task.dependsOnIndex !== undefined
          ? insertedIds[task.dependsOnIndex] ?? null
          : null;

      const result = await client.query<{ id: string }>(
        `insert into tasks
           (roadmap_id, goal_id, day_number, title, description, estimated_minutes,
            priority, success_criteria, why_it_matters, depends_on_task_id, status)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'LOCKED')
         returning id`,
        [
          roadmapId,
          goalId,
          task.dayNumber,
          task.title,
          task.description,
          task.estimatedMinutes,
          task.priority,
          task.successCriteria,
          task.whyItMatters,
          dependsOnId,
        ]
      );
      insertedIds.push(result.rows[0].id);
    }

    return roadmapId;
  });
}

/**
 * User approval: GENERATED/REVIEWING -> APPROVED -> ACTIVE.
 * Unlocks every task whose dependency is null or already completed.
 */
export async function approveRoadmap(roadmapId: string): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `update roadmaps set status = 'ACTIVE', approved_at = now() where id = $1`,
      [roadmapId]
    );
    await client.query(
      `update tasks
         set status = 'READY'
       where roadmap_id = $1
         and status = 'LOCKED'
         and depends_on_task_id is null`,
      [roadmapId]
    );
  });
}

/** Unlocks any task whose single dependency just completed. */
export async function unlockDependents(completedTaskId: string): Promise<void> {
  await query(
    `update tasks
       set status = 'READY'
     where depends_on_task_id = $1
       and status = 'LOCKED'`,
    [completedTaskId]
  );
}

export async function startTask(taskId: string): Promise<void> {
  await query(
    `update tasks set status = 'IN_PROGRESS', started_at = now()
     where id = $1 and status = 'READY'`,
    [taskId]
  );
}

/** VERIFY step — user states what they actually did; task becomes COMPLETED. */
export async function completeTask(taskId: string, verificationNote: string): Promise<void> {
  await query(
    `update tasks set status = 'COMPLETED', completed_at = now(), verification_note = $2
     where id = $1 and status in ('IN_PROGRESS','READY')`,
    [taskId, verificationNote]
  );
  await unlockDependents(taskId);
}

export type MissedReason =
  | "TASK_UNCLEAR"
  | "TASK_TOO_LARGE"
  | "NO_TIME"
  | "FORGOT"
  | "LOST_MOTIVATION"
  | "WRONG_PRIORITY"
  | "UNEXPECTED_SITUATION"
  | "DID_NOT_KNOW_HOW"
  | "INFORMATION_MISSING"
  | "OTHER";

export async function recordMissedTask(
  taskId: string,
  reason: MissedReason,
  followUpAnswer?: string
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(`update tasks set status = 'MISSED' where id = $1`, [taskId]);
    await client.query(
      `insert into missed_task_reasons (task_id, reason, follow_up_answer) values ($1,$2,$3)`,
      [taskId, reason, followUpAnswer ?? null]
    );
  });
}

/**
 * Second-level follow-up question per reason, matching section 12 of the spec.
 * Purely presentational — the actual answer is stored via recordMissedTask's
 * followUpAnswer.
 */
export function followUpQuestionFor(reason: MissedReason): string {
  switch (reason) {
    case "TASK_TOO_LARGE":
      return "Which smaller version could you complete in 15 minutes?";
    case "TASK_UNCLEAR":
      return "What part of the task was unclear — the action, the goal, or how to check it's done?";
    case "NO_TIME":
      return "Which fixed block of time this week could this realistically fit into?";
    case "FORGOT":
      return "Would a reminder closer to your usual execution time help?";
    case "LOST_MOTIVATION":
      return "Does this task still connect to why you started? If not, what would?";
    case "WRONG_PRIORITY":
      return "What took priority instead, and was that the right call?";
    case "UNEXPECTED_SITUATION":
      return "Was this a one-off, or something likely to happen again?";
    case "DID_NOT_KNOW_HOW":
      return "What specific information or example would make this doable?";
    case "INFORMATION_MISSING":
      return "What information is missing, and where could you get it?";
    default:
      return "What actually got in the way, in your own words?";
  }
}

export interface DueTask {
  id: string;
  title: string;
  description: string | null;
  estimated_minutes: number;
  priority: number;
  success_criteria: string | null;
  why_it_matters: string | null;
  status: string;
  due_date: string | null;
}

/**
 * The core dashboard query: "what is the ONE thing I need to execute now?"
 * Returns the single highest-priority READY (or IN_PROGRESS) task.
 */
export async function getPrimaryTask(userId: string): Promise<DueTask | null> {
  return queryOne<DueTask>(
    `select t.id, t.title, t.description, t.estimated_minutes, t.priority,
            t.success_criteria, t.why_it_matters, t.status, t.due_date
     from tasks t
     join goals g on g.id = t.goal_id
     where g.user_id = $1
       and t.status in ('IN_PROGRESS','READY')
     order by
       case t.status when 'IN_PROGRESS' then 0 else 1 end,
       t.priority asc,
       t.due_date asc nulls last,
       t.created_at asc
     limit 1`,
    [userId]
  );
}
