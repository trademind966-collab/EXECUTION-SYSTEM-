import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { pool, query, queryOne } from "@/lib/db";
import { persistRoadmap, approveRoadmap, completeTask } from "@/lib/engines/taskEngine";
import type { GeneratedTask } from "@/lib/engines/roadmap";

/**
 * Requires a reachable DATABASE_URL (the bundled local Postgres in dev/CI).
 * Skipped automatically if the DB isn't reachable, so `npm test` still runs
 * useful checks in environments without Postgres.
 */
let dbAvailable = true;
let userId: string;
let goalId: string;

beforeAll(async () => {
  try {
    await pool.query("select 1");
  } catch {
    dbAvailable = false;
    return;
  }

  const user = await queryOne<{ id: string }>(
    `insert into users (email, password_hash) values ($1, 'test-hash') returning id`,
    [`dep-test-${Date.now()}@test.local`]
  );
  userId = user!.id;

  const goal = await queryOne<{ id: string }>(
    `insert into goals (user_id, title, status) values ($1, 'Test goal', 'ACTIVE') returning id`,
    [userId]
  );
  goalId = goal!.id;
});

afterAll(async () => {
  if (!dbAvailable) return;
  await query(`delete from goals where user_id = $1`, [userId]);
  await query(`delete from users where id = $1`, [userId]);
});

describe("dependency locking (section 10 of the spec)", () => {
  it("keeps Task B locked until Task A is completed", async () => {
    if (!dbAvailable) {
      console.warn("Skipping: no reachable Postgres for integration test.");
      return;
    }

    const tasks: GeneratedTask[] = [
      {
        dayNumber: 1,
        title: "Task A",
        description: "First task",
        estimatedMinutes: 10,
        priority: 1,
        successCriteria: "done",
        whyItMatters: "matters",
        dependsOnIndex: null,
      },
      {
        dayNumber: 1,
        title: "Task B",
        description: "Depends on A",
        estimatedMinutes: 10,
        priority: 1,
        successCriteria: "done",
        whyItMatters: "matters",
        dependsOnIndex: 0,
      },
    ];

    const gap = await queryOne<{ id: string }>(
      `insert into gap_analyses (goal_id, summary) values ($1, 'test') returning id`,
      [goalId]
    );
    const roadmapId = await persistRoadmap(goalId, gap!.id, tasks);

    const before = await query<{ title: string; status: string }>(
      `select title, status from tasks where roadmap_id = $1 order by title`,
      [roadmapId]
    );
    expect(before.every((t) => t.status === "LOCKED")).toBe(true);

    await approveRoadmap(roadmapId);

    const afterApproval = await query<{ title: string; status: string }>(
      `select title, status from tasks where roadmap_id = $1 order by title`,
      [roadmapId]
    );
    const taskA = afterApproval.find((t) => t.title === "Task A")!;
    const taskB = afterApproval.find((t) => t.title === "Task B")!;
    expect(taskA.status).toBe("READY");
    expect(taskB.status).toBe("LOCKED"); // still locked — A not completed yet

    const taskARow = await queryOne<{ id: string }>(
      `select id from tasks where roadmap_id = $1 and title = 'Task A'`,
      [roadmapId]
    );
    await completeTask(taskARow!.id, "Actually did it");

    const afterComplete = await query<{ title: string; status: string }>(
      `select title, status from tasks where roadmap_id = $1 order by title`,
      [roadmapId]
    );
    const taskBAfter = afterComplete.find((t) => t.title === "Task B")!;
    expect(taskBAfter.status).toBe("READY"); // unlocked now that A is complete
  });
});
