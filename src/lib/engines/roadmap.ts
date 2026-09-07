import { generateJson } from "@/lib/ai/client";
import type { GoalInput, GapAnalysisResult } from "./gapAnalysis";

export interface GeneratedTask {
  dayNumber: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  priority: number; // 1 (highest) .. 5
  successCriteria: string;
  whyItMatters: string;
  dependsOnIndex: number | null; // index into the returned array, or null
}

const SYSTEM_PROMPT = `You design 30-day execution roadmaps for a personal accountability platform.
Rules:
- Tasks must be extremely small (5-30 minutes each), never vague ("build the business").
- Prefer verifiable, concrete actions ("write the exact problem in 1 sentence", "message 1 potential customer").
- Respect the user's stated available time per day/week — do not exceed it.
- Create explicit dependencies where a task genuinely requires a previous one; most tasks can be independent within a day.
- Each task needs: title, description, estimatedMinutes, priority (1-5), successCriteria (how the user knows it's done), whyItMatters (1 sentence tying it back to the goal's "why"), dependsOnIndex (0-based index of a prior task in the same array, or null).
- Return JSON: { "tasks": GeneratedTask[] } with 15-30 tasks spread across days 1-30 (not necessarily one per day).`;

export async function generateRoadmap(
  goal: GoalInput,
  gap: GapAnalysisResult
): Promise<GeneratedTask[]> {
  const ai = await generateJson<{ tasks: GeneratedTask[] }>({
    system: SYSTEM_PROMPT,
    user: JSON.stringify({ goal, gap }, null, 2),
  });

  if (ai?.tasks?.length) {
    return ai.tasks;
  }

  return ruleBasedRoadmap(goal);
}

/** Deterministic fallback: a generic but genuinely small-step 30-day skeleton. */
function ruleBasedRoadmap(goal: GoalInput): GeneratedTask[] {
  const steps: Omit<GeneratedTask, "dayNumber">[] = [
    {
      title: "Write the exact problem in one sentence",
      description: `Write, in one sentence, the specific problem "${goal.title}" is meant to solve.`,
      estimatedMinutes: 10,
      priority: 1,
      successCriteria: "One written sentence exists and you can read it back without rambling.",
      whyItMatters: goal.why ? `Keeps you anchored to: "${goal.why}"` : "Prevents drifting into vague effort.",
      dependsOnIndex: null,
    },
    {
      title: "Spend 15 minutes researching the problem",
      description: "Read or watch material specifically about this exact problem — not the whole topic.",
      estimatedMinutes: 15,
      priority: 2,
      successCriteria: "You can list 2 things you learned.",
      whyItMatters: "Closes part of the knowledge gap before committing time to a direction.",
      dependsOnIndex: 0,
    },
    {
      title: "Write 3 possible approaches",
      description: "List three different ways you could address the problem.",
      estimatedMinutes: 15,
      priority: 2,
      successCriteria: "Three distinct options are written down.",
      whyItMatters: "Avoids committing to the first idea without comparison.",
      dependsOnIndex: 1,
    },
    {
      title: "Talk to 1 person with relevant experience",
      description: "Ask one person who has relevant experience or is a potential 'customer' of this goal for their honest reaction.",
      estimatedMinutes: 20,
      priority: 1,
      successCriteria: "A real conversation happened and you recorded the response.",
      whyItMatters: "Real feedback beats assumptions.",
      dependsOnIndex: 2,
    },
    {
      title: "Record and compare the responses",
      description: "Write down what you heard and compare it against your 3 options.",
      estimatedMinutes: 10,
      priority: 2,
      successCriteria: "A short written comparison exists.",
      whyItMatters: "Turns one data point into a decision input.",
      dependsOnIndex: 3,
    },
    {
      title: "Choose the smallest next action",
      description: "Pick the smallest concrete action that moves the chosen approach forward this week.",
      estimatedMinutes: 10,
      priority: 1,
      successCriteria: "One next action is chosen and written down with a date.",
      whyItMatters: "Keeps momentum without over-planning.",
      dependsOnIndex: 4,
    },
  ];

  // Repeat the "small step" cadence across 30 days, spacing tasks out.
  const tasks: GeneratedTask[] = [];
  let day = 1;
  for (let i = 0; i < steps.length; i++) {
    tasks.push({ ...steps[i], dayNumber: day });
    day += i % 2 === 0 ? 1 : 2;
    if (day > 30) day = 30;
  }
  return tasks;
}
