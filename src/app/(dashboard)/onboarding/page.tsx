"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/utils/apiFetch";
import { Button, TextArea, ErrorText } from "@/components/ui/primitives";

interface Question {
  key: string;
  prompt: string;
  options?: string[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch<{ questions: Question[]; answers: { question_key: string; answer_text: string }[] }>(
      "/api/onboarding"
    ).then((data) => {
      setQuestions(data.questions);
      const answerMap: Record<string, string> = {};
      for (const a of data.answers) answerMap[a.question_key] = a.answer_text;
      setAnswers(answerMap);
      const firstUnanswered = data.questions.findIndex((q) => !answerMap[q.key]);
      setIndex(firstUnanswered === -1 ? data.questions.length : firstUnanswered);
      setLoaded(true);
    });
  }, []);

  const current = questions[index];

  // Reset the draft input whenever the current question changes. Adjusting
  // state during render (rather than in a useEffect) avoids an extra
  // render pass — see https://react.dev/learn/you-might-not-need-an-effect
  const [prevQuestionKey, setPrevQuestionKey] = useState<string | undefined>(undefined);
  if (current && current.key !== prevQuestionKey) {
    setPrevQuestionKey(current.key);
    setDraft(answers[current.key] ?? "");
  }

  async function submitAnswer(value: string) {
    if (!current) return;
    setError(null);
    setSaving(true);
    try {
      await apiFetch("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({ questionKey: current.key, answerText: value }),
      });
      setAnswers((prev) => ({ ...prev, [current.key]: value }));
      if (index + 1 >= questions.length) {
        router.push("/goals/new?fromOnboarding=1");
      } else {
        setIndex(index + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your answer.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  if (!current) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-ink-muted">All set — taking you to create your first goal…</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <p className="text-sm text-ink-muted mb-2">
        Question {index + 1} of {questions.length}
      </p>
      <h1 className="font-display text-2xl mb-6">{current.prompt}</h1>

      {current.options ? (
        <div className="grid grid-cols-2 gap-3">
          {current.options.map((opt) => (
            <button
              key={opt}
              onClick={() => submitAnswer(opt)}
              disabled={saving}
              className={`border px-4 py-3 text-left text-sm transition-colors ${
                answers[current.key] === opt
                  ? "border-moss bg-moss text-paper"
                  : "border-rule hover:border-moss"
              }`}
            >
              {opt.replaceAll("_", " ").toLowerCase()}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <TextArea
            rows={4}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitAnswer(draft);
            }}
          />
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-3">
            <Button onClick={() => submitAnswer(draft)} disabled={saving || !draft.trim()}>
              {saving ? "Saving…" : "Continue"}
            </Button>
            {index > 0 && (
              <Button variant="quiet" onClick={() => setIndex(index - 1)} type="button">
                Back
              </Button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
