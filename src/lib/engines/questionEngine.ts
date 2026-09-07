import { generateJson } from "@/lib/ai/client";

export interface FollowUpContext {
  previousAnswer: string;
  goalTitle?: string;
}

/**
 * Rule-based decision tree matching the "I have ideas but don't execute"
 * example in section 8. Kept as explicit rules (not a black box) so the
 * questions stay predictable and debuggable; AI is used only to pick which
 * branch best matches free-text input, with keyword matching as the fallback.
 */
const BRANCHES: { keywords: string[]; questions: string[] }[] = [
  {
    keywords: ["idea", "ideas", "don't execute", "not executing", "never start"],
    questions: [
      "How many ideas did you start?",
      "How many reached execution?",
      "Where exactly did execution stop?",
      "Was the task unclear?",
      "Was it too large?",
      "Was there no deadline?",
      "Was there no accountability?",
      "Was there a competing priority?",
      "Did you lose confidence?",
      "Did circumstances change?",
    ],
  },
  {
    keywords: ["time", "busy", "no time"],
    questions: [
      "On a typical day, what already fills your time?",
      "Is there a specific time block, even 15 minutes, that's currently unclaimed?",
      "Would this goal fit better as a daily or a few-times-a-week habit?",
    ],
  },
  {
    keywords: ["motivat", "give up", "quit"],
    questions: [
      "When did you last feel motivated about this, and what was different then?",
      "Is the goal still the one you actually want, or has it changed?",
      "What's the smallest version of progress that would still feel meaningful?",
    ],
  },
  {
    keywords: ["money", "budget", "resource", "afford"],
    questions: [
      "What's the minimum resource level needed for the very first step?",
      "Is there a free or low-cost way to test the idea before investing?",
    ],
  },
];

export async function getFollowUpQuestions(ctx: FollowUpContext): Promise<string[]> {
  const ai = await generateJson<{ questions: string[] }>({
    system: `You are a diagnostic question engine for an execution-accountability platform.
Given the user's previous answer, produce 3-6 specific follow-up questions that would help
identify the ACTUAL blocker (not generic motivational questions). Avoid repeating generic
questions already implied by the answer. Return JSON: { "questions": string[] }.`,
    user: JSON.stringify(ctx),
  });

  if (ai?.questions?.length) return ai.questions;

  const lower = ctx.previousAnswer.toLowerCase();
  for (const branch of BRANCHES) {
    if (branch.keywords.some((k) => lower.includes(k))) {
      return branch.questions;
    }
  }

  // Generic but still targeted fallback (never purely generic filler).
  return [
    "What exactly happened the last time you tried to act on this?",
    "What would have needed to be true for you to follow through?",
    "Is there a specific moment where you decided not to continue?",
  ];
}
