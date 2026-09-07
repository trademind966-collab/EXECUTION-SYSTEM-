"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/utils/apiFetch";
import { Card, Button, ErrorText } from "@/components/ui/primitives";

interface Goal {
  id: string;
  title: string;
  why: string | null;
  status: string;
}

interface GapAnalysis {
  id: string;
  summary: string;
  knowledge_gap: string;
  skill_gap: string;
  resource_gap: string;
  time_gap: string;
  execution_gap: string;
  consistency_gap: string;
  strategy_gap: string;
  information_gap: string;
  environment_gap: string;
  accountability_gap: string;
}

interface Roadmap {
  id: string;
  status: string;
}

interface Task {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  estimated_minutes: number;
  status: string;
}

const GAP_LABELS: Record<string, string> = {
  knowledge_gap: "Knowledge",
  skill_gap: "Skill",
  resource_gap: "Resources",
  time_gap: "Time",
  execution_gap: "Execution",
  consistency_gap: "Consistency",
  strategy_gap: "Strategy",
  information_gap: "Information",
  environment_gap: "Environment",
  accountability_gap: "Accountability",
};

export default function GoalDetailPage({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = usePromise(params);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [gap, setGap] = useState<GapAnalysis | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const g = await apiFetch<{ goal: Goal }>(`/api/goals/${goalId}`);
    setGoal(g.goal);
    const gaps = await apiFetch<{ analyses: GapAnalysis[] }>(`/api/gap-analysis?goalId=${goalId}`);
    setGap(gaps.analyses[0] ?? null);
    const roadmaps = await apiFetch<{ roadmaps: Roadmap[] }>(`/api/roadmap?goalId=${goalId}`);
    const latest = roadmaps.roadmaps[0] ?? null;
    setRoadmap(latest);
    if (latest) {
      const t = await apiFetch<{ tasks: Task[] }>(`/api/roadmap/${latest.id}/tasks`);
      setTasks(t.tasks);
    }
  }

  useEffect(() => {
    // Standard fetch-on-mount pattern; `load` sets state asynchronously
    // after awaited network calls, not synchronously within the effect body.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    load();
  }, [goalId]);

  async function runGapAnalysis() {
    setError(null);
    setBusy("gap");
    try {
      await apiFetch("/api/gap-analysis", { method: "POST", body: JSON.stringify({ goalId }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run gap analysis.");
    } finally {
      setBusy(null);
    }
  }

  async function generateRoadmap() {
    if (!gap) return;
    setError(null);
    setBusy("roadmap");
    try {
      await apiFetch("/api/roadmap", {
        method: "POST",
        body: JSON.stringify({ goalId, gapAnalysisId: gap.id }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate roadmap.");
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    if (!roadmap) return;
    setError(null);
    setBusy("approve");
    try {
      await apiFetch(`/api/roadmap/${roadmap.id}/approve`, { method: "POST" });
      await apiFetch(`/api/goals/${goalId}`, { method: "PATCH", body: JSON.stringify({ status: "ACTIVE" }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve roadmap.");
    } finally {
      setBusy(null);
    }
  }

  if (!goal) return null;

  return (
    <main className="max-w-2xl mx-auto px-6 py-12 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-muted">{goal.status}</p>
        <h1 className="font-display text-3xl">{goal.title}</h1>
        {goal.why && <p className="text-ink-muted mt-2">{goal.why}</p>}
      </div>

      <ErrorText>{error}</ErrorText>

      {!gap && (
        <Card>
          <p className="text-sm text-ink-muted mb-4">
            Next: find the gap between where you are and where you want to be — before planning any tasks.
          </p>
          <Button onClick={runGapAnalysis} disabled={busy === "gap"}>
            {busy === "gap" ? "Analyzing…" : "Run gap analysis"}
          </Button>
        </Card>
      )}

      {gap && (
        <section>
          <h2 className="font-display text-xl mb-3">Gap analysis</h2>
          <Card className="space-y-3">
            <p className="text-sm">{gap.summary}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(GAP_LABELS).map(([field, label]) => (
                <div key={field}>
                  <dt className="text-ink-muted text-xs uppercase tracking-wide">{label}</dt>
                  <dd>{(gap as unknown as Record<string, string>)[field]}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </section>
      )}

      {gap && !roadmap && (
        <Card>
          <p className="text-sm text-ink-muted mb-4">
            Next: generate a 30-day roadmap of small, specific tasks. You&apos;ll review and approve it before
            anything becomes active.
          </p>
          <Button onClick={generateRoadmap} disabled={busy === "roadmap"}>
            {busy === "roadmap" ? "Generating…" : "Generate roadmap"}
          </Button>
        </Card>
      )}

      {roadmap && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl">Roadmap</h2>
            <span className="text-xs uppercase tracking-wide text-ink-muted">{roadmap.status}</span>
          </div>
          {roadmap.status === "GENERATED" && (
            <Card className="mb-4">
              <p className="text-sm text-ink-muted mb-4">
                Review the tasks below. Edit anything that doesn&apos;t fit, then approve to make it active.
              </p>
              <Button onClick={approve} disabled={busy === "approve"}>
                {busy === "approve" ? "Approving…" : "Approve roadmap"}
              </Button>
            </Card>
          )}
          <ol className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="border border-rule bg-card p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-ink-muted">Day {t.day_number} · {t.estimated_minutes} min</p>
                  <p className="font-medium">{t.title}</p>
                  {t.description && <p className="text-sm text-ink-muted mt-1">{t.description}</p>}
                </div>
                <span className="text-xs uppercase tracking-wide text-ink-muted whitespace-nowrap">{t.status}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <Link href="/dashboard" className="inline-block text-sm text-moss underline">
        Go to today&apos;s task →
      </Link>
    </main>
  );
}
