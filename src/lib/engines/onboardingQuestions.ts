export interface OnboardingQuestion {
  key: string;
  prompt: string;
  options?: string[];
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  { key: "BIG_GOAL", prompt: "What is your big goal?" },
  { key: "WHY", prompt: "Why did you start?" },
  { key: "DESIRED_RESULT", prompt: "What result do you actually want?" },
  { key: "PLAN", prompt: "How are you planning to achieve it?" },
  { key: "EXPERIENCE", prompt: "What experience do you already have?" },
  { key: "CURRENT_STATE", prompt: "Where are you today?" },
  { key: "TARGET_STATE", prompt: "Where do you want to reach?" },
  { key: "RESOURCES", prompt: "What resources do you currently have?" },
  { key: "PAST_ATTEMPTS", prompt: "What have you already tried?" },
  { key: "BLOCKER", prompt: "What is stopping you?" },
  { key: "AVAILABLE_TIME", prompt: "How much realistic time can you give every day/week?" },
  { key: "PROGRESS_PROOF", prompt: "What would prove that you are progressing?" },
  { key: "STOP_RISK", prompt: "What is the biggest reason you might stop?" },
  {
    key: "ACCOUNTABILITY_STYLE",
    prompt: "What kind of accountability do you prefer?",
    options: ["GENTLE", "BALANCED", "DIRECT", "VERY_DIRECT"],
  },
];

export function questionByKey(key: string): OnboardingQuestion | undefined {
  return ONBOARDING_QUESTIONS.find((q) => q.key === key);
}
