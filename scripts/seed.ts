import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
config({ path: ".env.local" });
config();

const DEV_PASSWORD = "DevPassword123"; // dev/seed only — never used in production

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: false } : undefined,
  });
  const hash = await bcrypt.hash(DEV_PASSWORD, 12);

  async function upsertUser(email: string, role: string, fullName: string) {
    const existing = await pool.query(`select id from users where email = $1`, [email]);
    if (existing.rows.length > 0) return existing.rows[0].id as string;
    const result = await pool.query(
      `insert into users (email, password_hash, role, full_name, status, email_verified_at)
       values ($1,$2,$3,$4,'ACTIVE', now()) returning id`,
      [email, hash, role, fullName]
    );
    return result.rows[0].id as string;
  }

  console.log("Seeding development data (fake/sample data only)...");

  await upsertUser("super.admin@dev.local", "SUPER_ADMIN", "Sample Super Admin");
  await upsertUser("admin@dev.local", "ADMIN", "Sample Admin");
  await upsertUser("manager@dev.local", "MANAGER", "Sample Manager");
  await upsertUser("counsellor@dev.local", "COUNSELLOR", "Sample Counsellor");
  const user1 = await upsertUser("user1@dev.local", "USER", "Sample User One");
  await upsertUser("user2@dev.local", "USER", "Sample User Two");

  // Sample onboarding answers for user1
  const onboardingAnswers: [string, string][] = [
    ["BIG_GOAL", "Launch a small freelance design business"],
    ["WHY", "I want more control over my time and income"],
    ["DESIRED_RESULT", "3 paying clients within 90 days"],
    ["CURRENT_STATE", "I have design skills but no clients or portfolio site"],
    ["TARGET_STATE", "A live portfolio and a repeatable outreach process"],
    ["BLOCKER", "I have ideas but I don't execute"],
    ["AVAILABLE_TIME", "1 hour on weekday evenings"],
    ["ACCOUNTABILITY_STYLE", "BALANCED"],
  ];
  for (const [key, answer] of onboardingAnswers) {
    await pool.query(
      `insert into onboarding_answers (user_id, question_key, answer_text)
       values ($1,$2,$3) on conflict (user_id, question_key) do update set answer_text = excluded.answer_text`,
      [user1, key, answer]
    );
  }

  // Sample goal
  const goalResult = await pool.query(
    `insert into goals (user_id, title, why, desired_result, current_state, target_state, available_time, status, priority)
     values ($1,$2,$3,$4,$5,$6,$7,'ACTIVE',1)
     returning id`,
    [
      user1,
      "Launch a small freelance design business",
      "I want more control over my time and income",
      "3 paying clients within 90 days",
      "I have design skills but no clients or portfolio site",
      "A live portfolio and a repeatable outreach process",
      "1 hour on weekday evenings",
    ]
  );
  const goalId = goalResult.rows[0].id as string;

  // Sample gap analysis
  const gapResult = await pool.query(
    `insert into gap_analyses (goal_id, execution_gap, strategy_gap, summary, generated_by_ai)
     values ($1,$2,$3,$4,false) returning id`,
    [
      goalId,
      'Stated blocker: "I have ideas but I don\'t execute." This is the most actionable gap to address first.',
      "No portfolio or outreach process exists yet — strategy needs a first concrete channel.",
      "Sample rule-based gap analysis seed data.",
    ]
  );
  const gapId = gapResult.rows[0].id as string;

  // Sample roadmap + small dependent tasks
  const roadmapResult = await pool.query(
    `insert into roadmaps (goal_id, gap_analysis_id, status, approved_at) values ($1,$2,'ACTIVE', now()) returning id`,
    [goalId, gapId]
  );
  const roadmapId = roadmapResult.rows[0].id as string;

  const t1 = await pool.query(
    `insert into tasks (roadmap_id, goal_id, day_number, title, description, estimated_minutes, priority, success_criteria, why_it_matters, status)
     values ($1,$2,1,'Write the exact problem in one sentence','Describe who you want to serve and with what design service.',10,1,'One sentence is written down.','Keeps the business idea specific instead of vague.','READY')
     returning id`,
    [roadmapId, goalId]
  );
  const t2 = await pool.query(
    `insert into tasks (roadmap_id, goal_id, day_number, title, description, estimated_minutes, priority, success_criteria, why_it_matters, depends_on_task_id, status)
     values ($1,$2,2,'List 3 potential first clients','Think of 3 real people or companies who might need this service.',15,2,'3 names are written down.','Turns the idea into a concrete first outreach list.',$3,'LOCKED')
     returning id`,
    [roadmapId, goalId, t1.rows[0].id]
  );

  console.log(`Seeded sample task chain: ${t1.rows[0].id} -> ${t2.rows[0].id}`);
  console.log("\nDone. Sample login (dev only): user1@dev.local / " + DEV_PASSWORD);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
