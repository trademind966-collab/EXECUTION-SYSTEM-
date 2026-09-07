"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/utils/apiFetch";
import { Button, TextField, TextArea, ErrorText } from "@/components/ui/primitives";

export default function NewGoalPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    why: "",
    desiredResult: "",
    currentState: "",
    targetState: "",
    availableTime: "",
    experience: "",
    resources: "",
    constraints: "",
    blockers: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ goalId: string }>("/api/goals", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.push(`/goals/${res.goalId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create goal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-1">Define the goal</h1>
      <p className="text-ink-muted text-sm mb-8">
        This is yours to edit any time — nothing here locks you in.
      </p>
      <form onSubmit={onSubmit} className="space-y-5">
        <TextField label="Big goal" required value={form.title} onChange={(e) => set("title", e.target.value)} />
        <TextArea label="Why did you start?" rows={2} value={form.why} onChange={(e) => set("why", e.target.value)} />
        <TextArea
          label="What result do you actually want?"
          rows={2}
          value={form.desiredResult}
          onChange={(e) => set("desiredResult", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextArea
            label="Where are you today?"
            rows={2}
            value={form.currentState}
            onChange={(e) => set("currentState", e.target.value)}
          />
          <TextArea
            label="Where do you want to reach?"
            rows={2}
            value={form.targetState}
            onChange={(e) => set("targetState", e.target.value)}
          />
        </div>
        <TextField
          label="Realistic time available (per day/week)"
          value={form.availableTime}
          onChange={(e) => set("availableTime", e.target.value)}
        />
        <TextArea
          label="Experience you already have"
          rows={2}
          value={form.experience}
          onChange={(e) => set("experience", e.target.value)}
        />
        <TextArea label="Resources you have" rows={2} value={form.resources} onChange={(e) => set("resources", e.target.value)} />
        <TextArea
          label="Constraints"
          rows={2}
          value={form.constraints}
          onChange={(e) => set("constraints", e.target.value)}
        />
        <TextArea
          label="What's stopping you?"
          rows={2}
          value={form.blockers}
          onChange={(e) => set("blockers", e.target.value)}
        />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Create goal"}
        </Button>
      </form>
    </main>
  );
}
