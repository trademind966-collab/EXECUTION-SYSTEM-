import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth/session";
import { acknowledgePattern } from "@/lib/engines/patternDetection";
import { z } from "zod";

const schema = z.object({ status: z.enum(["ACKNOWLEDGED", "RESOLVED"]) });

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

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

    await acknowledgePattern(patternId, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
