import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth/session";
import { escalatePattern } from "@/lib/engines/patternDetection";
import { z } from "zod";

const schema = z.object({ notes: z.string().optional() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patternId: string }> }
) {
  try {
    const user = await requireUser();
    const { patternId } = await params;

    const pattern = await queryOne<{ user_id: string }>(`select user_id from patterns where id = $1`, [
      patternId,
    ]);
    if (!pattern || pattern.user_id !== user.id) {
      return NextResponse.json({ error: "Not found or forbidden." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);

    const escalationId = await escalatePattern(user.id, patternId, parsed.success ? parsed.data.notes : undefined);
    return NextResponse.json({ ok: true, escalationId }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
