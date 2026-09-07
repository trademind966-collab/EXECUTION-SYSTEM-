import { NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/auth/session";
import { getPrimaryTask } from "@/lib/engines/taskEngine";

export async function GET() {
  try {
    const user = await requireUser();
    const task = await getPrimaryTask(user.id);
    return NextResponse.json({ task });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
