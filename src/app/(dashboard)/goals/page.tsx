"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/utils/apiFetch";
import { Card, Button } from "@/components/ui/primitives";

interface Goal {
  id: string;
  title: string;
  status: string;
  priority: number;
  created_at: string;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null);

  useEffect(() => {
    apiFetch<{ goals: Goal[] }>("/api/goals").then((d) => setGoals(d.goals));
  }, []);

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Your goals</h1>
        <Link href="/goals/new">
          <Button>New goal</Button>
        </Link>
      </div>

      {goals === null && <p className="text-ink-muted text-sm">Loading…</p>}

      {goals?.length === 0 && (
        <Card>
          <p className="text-ink-muted text-sm">
            No goals yet. A goal isn&apos;t real until it&apos;s broken into something you can start today.
          </p>
          <Link href="/goals/new" className="inline-block mt-4">
            <Button>Create your first goal</Button>
          </Link>
        </Card>
      )}

      <ul className="space-y-3">
        {goals?.map((g) => (
          <li key={g.id}>
            <Link href={`/goals/${g.id}`}>
              <Card className="hover:border-moss transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{g.title}</span>
                  <span className="text-xs text-ink-muted uppercase tracking-wide">{g.status}</span>
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
