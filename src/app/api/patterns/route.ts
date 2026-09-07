import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireUser();
    const patterns = await query(
      `select * from patterns where user_id = $1 order by last_detected_at desc`,
      [user.id]
    );
    return NextResponse.json({ patterns });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
