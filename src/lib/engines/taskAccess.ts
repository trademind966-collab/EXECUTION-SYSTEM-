import { queryOne } from "@/lib/db";
import { canAccessOwnedResource, type Role } from "@/lib/permissions/rbac";

export async function assertTaskAccess(taskId: string, userId: string, role: Role) {
  const task = await queryOne<{ id: string; goal_id: string }>(
    `select id, goal_id from tasks where id = $1`,
    [taskId]
  );
  if (!task) return null;
  const goal = await queryOne<{ user_id: string }>(`select user_id from goals where id = $1`, [
    task.goal_id,
  ]);
  if (!goal || !canAccessOwnedResource(role, goal.user_id, userId)) return null;
  return task;
}
