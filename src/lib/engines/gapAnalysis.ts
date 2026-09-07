import { generateJson } from "@/lib/ai/client";

export interface GoalInput {
  title: string;
  why?: string | null;
  desiredResult?: string | null;
  currentState?: string | null;
  targetState?: string | null;
  experience?: string | null;
  resources?: string | null;
  constraints?: string | null;
  blockers?: string | null;
  availableTime?: string | null;
}

export interface GapAnalysisResult {
  knowledgeGap: string;
  skillGap: string;
  resourceGap: string;
  timeGap: string;
  executionGap: string;
  consistencyGap: string;
  strategyGap: string;
  informationGap: string;
  environmentGap: string;
  accountabilityGap: string;
  summary: string;
  generatedByAi: boolean;
}

const GAP_CATEGORIES = [
  "knowledgeGap",
  "skillGap",
  "resourceGap",
  "timeGap",
  "executionGap",
  "consistencyGap",
  "strategyGap",
  "informationGap",
  "environmentGap",
  "accountabilityGap",
] as const;

/**
 * IMPORTANT: this engine investigates before concluding. It never labels the
 * user (lazy / undisciplined / etc). Every gap is phrased as a neutral,
 * structural observation the user can act on or dispute.
 */
export async function analyzeGap(goal: GoalInput): Promise<GapAnalysisResult> {
  const ai = await generateJson<Record<string, string>>({
    system: `You are a gap-analysis engine for a personal execution platform.
Given a goal and the user's own description of their current state, experience,
resources, constraints and blockers, identify concrete, neutral gaps across
these categories: knowledgeGap, skillGap, resourceGap, timeGap, executionGap,
consistencyGap, strategyGap, informationGap, environmentGap, accountabilityGap.

Rules:
- Never assume the user is lazy, undisciplined, or has a mental health condition.
- If information is insufficient to assess a category, say so plainly instead of guessing.
- Each field: 1-2 concise sentences, specific to what the user actually wrote.
- Add a "summary" field: 2-3 sentences summarizing the overall gap.
Return strict JSON with exactly these keys: ${GAP_CATEGORIES.join(", ")}, summary.`,
    user: JSON.stringify(goal, null, 2),
  });

  if (ai && GAP_CATEGORIES.every((k) => typeof ai[k] === "string")) {
    return {
      knowledgeGap: ai.knowledgeGap,
      skillGap: ai.skillGap,
      resourceGap: ai.resourceGap,
      timeGap: ai.timeGap,
      executionGap: ai.executionGap,
      consistencyGap: ai.consistencyGap,
      strategyGap: ai.strategyGap,
      informationGap: ai.informationGap,
      environmentGap: ai.environmentGap,
      accountabilityGap: ai.accountabilityGap,
      summary: ai.summary ?? "",
      generatedByAi: true,
    };
  }

  return ruleBasedGapAnalysis(goal);
}

/** Deterministic fallback used when no AI key is configured. */
function ruleBasedGapAnalysis(goal: GoalInput): GapAnalysisResult {
  const missing = (v: string | null | undefined) =>
    !v || v.trim().length < 3
      ? "Not enough information yet — this needs a follow-up question before we can assess it."
      : null;

  const knowledgeGap =
    missing(goal.experience) ??
    `Based on stated experience ("${goal.experience}"), assess whether current knowledge covers the first roadmap milestone before assuming a deep knowledge gap.`;

  const resourceGap =
    missing(goal.resources) ??
    `Stated resources: "${goal.resources}". Compare against what the first two weeks of the roadmap will require.`;

  const timeGap =
    missing(goal.availableTime) ??
    `Available time stated as "${goal.availableTime}". This bounds how large each task can realistically be.`;

  const environmentGap =
    missing(goal.constraints) ??
    `Stated constraints: "${goal.constraints}". These may need to be designed around rather than removed.`;

  const strategyGap = goal.targetState
    ? `Current state ("${goal.currentState}") vs target state ("${goal.targetState}") implies a path that hasn't been chosen yet — the roadmap should propose one for approval.`
    : "Target state not yet defined clearly enough to select a strategy.";

  return {
    knowledgeGap,
    skillGap: "Insufficient signal yet — the question engine should probe for specific past attempts.",
    resourceGap,
    timeGap,
    executionGap: goal.blockers
      ? `Stated blocker: "${goal.blockers}". This is the most actionable gap to address first.`
      : "No blocker stated yet — ask what stopped previous attempts, if any.",
    consistencyGap: "Unknown until the first 1-2 weeks of task completion data exist.",
    strategyGap,
    informationGap: "Unknown — ask what the user has already researched or tried.",
    environmentGap,
    accountabilityGap: "Unknown until accountability-style preference and reminder response are observed.",
    summary:
      "Rule-based baseline gap analysis (AI not configured). Investigate the flagged categories through follow-up questions rather than assuming a cause.",
    generatedByAi: false,
  };
}
