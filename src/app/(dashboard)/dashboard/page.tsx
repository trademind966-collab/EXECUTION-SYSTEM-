"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/utils/apiFetch";
import { Button, Card, ErrorText, TextArea } from "@/components/ui/primitives";

interface PrimaryTask {
  id: string;
  title: string;
  description: string | null;
  estimated_minutes: number;
  success_criteria: string | null;
  why_it_matters: string | null;
  status: "READY" | "IN_PROGRESS";
}

interface ExecutionScore {
  completedVerified: number;
  due: number;
  rate: number;
  formula: string;
}

interface PatternRow {
  id: string;
  blocker: string;
  occurrence_count: number;
  status: string;
}

const MISS_REASONS: { value: string; label: string }[] = [
  { value: "TASK_UNCLEAR", label: "The task wasn't clear" },
  { value: "TASK_TOO_LARGE", label: "It was too large" },
  { value: "NO_TIME", label: "There was no time" },
  { value: "FORGOT", label: "I forgot" },
  { value: "LOST_MOTIVATION", label: "I lost motivation" },
  { value: "WRONG_PRIORITY", label: "Something else took priority" },
  { value: "UNEXPECTED_SITUATION", label: "Something unexpected came up" },
  { value: "DID_NOT_KNOW_HOW", label: "I didn't know how" },
  { value: "INFORMATION_MISSING", label: "I was missing information" },
  { value: "OTHER", label: "Something else" },
];

export default function DashboardPage() {
  const [task, setTask] = useState<PrimaryTask | null | undefined>(undefined);
  const [score, setScore] = useState<ExecutionScore | null>(null);
  const [patterns, setPatterns] = useState<PatternRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"idle" | "complete" | "miss" | "missFollowUp">("idle");
  const [verificationNote, setVerificationNote] = useState("");
  const [missReason, setMissReason] = useState(MISS_REASONS[0].value);
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [taskRes, scoreRes, patternsRes] = await Promise.all([
        apiFetch<{ task: PrimaryTask | null }>("/api/tasks/primary"),
        apiFetch<{ score: ExecutionScore }>("/api/execution-score"),
        apiFetch<{ patterns: PatternRow[] }>("/api/patterns"),
      ]);
      setTask(taskRes.task);
      setScore(scoreRes.score);
      setPatterns(patternsRes.patterns.filter((p) => p.status === "OPEN"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load your dashboard.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleStart() {
    if (!task) return;
    setBusy(true);
    try {
      await apiFetch(`/api/tasks/${task.id}/start`, { method: "POST" });
      setTask({ ...task, status: "IN_PROGRESS" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the task.");
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (!task || !verificationNote.trim()) return;
    setBusy(true);
    try {
      await apiFetch(`/api/tasks/${task.id}/complete`, {
        method: "POST",
        body: JSON.stringify({ verificationNote }),
      });
      setMode("idle");
      setVerificationNote("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't complete the task.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMiss() {
    if (!task) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ followUpQuestion: string }>(`/api/tasks/${task.id}/miss`, {
        method: "POST",
        body: JSON.stringify({ reason: missReason }),
      });
      setFollowUpQuestion(res.followUpQuestion);
      setMode("missFollowUp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't record that.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMissFollowUp() {
    if (!task) return;
    setBusy(true);
    try {
      await apiFetch(`/api/tasks/${task.id}/miss`, {
        method: "POST",
        body: JSON.stringify({ reason: missReason, followUpAnswer }),
      });
      setMode("idle");
      setFollowUpAnswer("");
      setFollowUpQuestion(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't record that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-1">Today</h1>
      <p className="text-ink-muted text-sm mb-8">The one thing to execute right now.</p>

      <ErrorText>{error}</ErrorText>

      {task === undefined && <p className="text-ink-muted text-sm">Loading…</p>}

      {task === null && (
        <Card>
          <p className="text-ink-muted text-sm mb-4">
            Nothing is ready to execute right now — start by creating a goal, or approve a
            generated roadmap.
          </p>
          <Link href="/goals/new">
            <Button>Create a goal</Button>
          </Link>
        </Card>
      )}

      {task && (
        <Card className="mb-6">
          <div className="text-xs uppercase tracking-wide text-moss mb-2">
            {task.status === "IN_PROGRESS" ? "In progress" : "Ready"}
          </div>
          <h2 className="font-display text-2xl mb-2">{task.title}</h2>
          {task.description && <p className="text-ink-muted text-sm mb-4">{task.description}</p>}
          <div className="flex gap-6 text-xs text-ink-muted mb-4">
            <span>{task.estimated_minutes} min</span>
            {task.success_criteria && <span>Done when: {task.success_criteria}</span>}
          </div>
          {task.why_it_matters && (
            <p className="text-sm italic text-ink-muted border-t border-rule pt-3 mb-4">
              {task.why_it_matters}
            </p>
          )}

          {mode === "idle" && (
            <div className="flex gap-2">
              {task.status === "READY" && (
                <Button onClick={handleStart} disabled={busy}>
                  Start task
                </Button>
              )}
              {task.status === "IN_PROGRESS" && (
                <Button onClick={() => setMode("complete")} disabled={busy}>
                  Mark complete
                </Button>
              )}
              <Button variant="quiet" onClick={() => setMode("miss")} disabled={busy}>
                Mark as missed
              </Button>
            </div>
          )}

          {mode === "complete" && (
            <div className="space-y-3">
              <TextArea
                label="What exactly did you do? What changed?"
                value={verificationNote}
                onChange={(e) => setVerificationNote(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={handleComplete} disabled={busy || !verificationNote.trim()}>
                  Confirm complete
                </Button>
                <Button variant="quiet" onClick={() => setMode("idle")}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {mode === "miss" && (
            <div className="space-y-3">
              <label className="block text-sm text-ink-muted">
                What got in the way?
                <select
                  className="w-full border border-rule bg-card px-3 py-2 mt-1"
                  value={missReason}
                  onChange={(e) => setMissReason(e.target.value)}
                >
                  {MISS_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <Button onClick={handleMiss} disabled={busy}>
                  Continue
                </Button>
                <Button variant="quiet" onClick={() => setMode("idle")}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {mode === "missFollowUp" && followUpQuestion && (
            <div className="space-y-3">
              <p className="text-sm">{followUpQuestion}</p>
              <TextArea
                value={followUpAnswer}
                onChange={(e) => setFollowUpAnswer(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={handleMissFollowUp} disabled={busy}>
                  Save
                </Button>
                <Button variant="quiet" onClick={() => setMode("idle")}>
                  Skip
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {score && (
        <Card className="mb-6">
          <div className="text-xs uppercase tracking-wide text-ink-muted mb-2">
            Execution rate — last 30 days
          </div>
          <div className="font-display text-3xl mb-1">{Math.round(score.rate * 100)}%</div>
          <p className="text-xs text-ink-muted">
            {score.formula} — {score.completedVerified} / {score.due}
          </p>
        </Card>
      )}

      {patterns.length > 0 && (
        <Card className="border-clay">
          <div className="text-xs uppercase tracking-wide text-clay mb-2">Pattern noticed</div>
          {patterns.map((p) => (
            <p key={p.id} className="text-sm text-ink-muted mb-2">
              Tasks citing &quot;{p.blocker.toLowerCase().replaceAll("_", " ")}&quot; have come up{" "}
              {p.occurrence_count} times. Worth looking at together.
            </p>
          ))}
        </Card>
      )}
    </main>
  );
}
