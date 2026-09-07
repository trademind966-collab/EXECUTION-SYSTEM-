import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth/session";
import { z } from "zod";

export async function GET() {
  try {
    const user = await requireUser();
    const goals = await query(
      `select * from goals where user_id = $1 order by created_at desc`,
      [user.id]
    );
    return NextResponse.json({ goals });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}

const createGoalSchema = z.object({
  title: z.string().min(1).max(300),
  why: z.string().optional(),
  desiredResult: z.string().optional(),
  currentState: z.string().optional(),
  targetState: z.string().optional(),
  deadline: z.string().optional(), // ISO date
  availableTime: z.string().optional(),
  experience: z.string().optional(),
  resources: z.string().optional(),
  constraints: z.string().optional(),
  risks: z.string().optional(),
  blockers: z.string().optional(),
  priority: z.number().int().min(1).max(5).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = createGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const g = parsed.data;

    const [goal] = await query<{ id: string }>(
      `insert into goals
         (user_id, title, why, desired_result, current_state, target_state, deadline,
          available_time, experience, resources, constraints, risks, blockers, priority, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'DRAFT')
       returning id`,
      [
        user.id,
        g.title,
        g.why ?? null,
        g.desiredResult ?? null,
        g.currentState ?? null,
        g.targetState ?? null,
        g.deadline ?? null,
        g.availableTime ?? null,
        g.experience ?? null,
        g.resources ?? null,
        g.constraints ?? null,
        g.risks ?? null,
        g.blockers ?? null,
        g.priority ?? 3,
      ]
    );

    return NextResponse.json({ ok: true, goalId: goal.id }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
