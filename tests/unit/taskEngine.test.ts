import { describe, it, expect } from "vitest";
import { followUpQuestionFor } from "@/lib/engines/taskEngine";

describe("followUpQuestionFor", () => {
  it("asks for a smaller version when the task was too large", () => {
    expect(followUpQuestionFor("TASK_TOO_LARGE")).toMatch(/15 minutes/);
  });

  it("returns a distinct question for every defined reason", () => {
    const reasons = [
      "TASK_UNCLEAR",
      "TASK_TOO_LARGE",
      "NO_TIME",
      "FORGOT",
      "LOST_MOTIVATION",
      "WRONG_PRIORITY",
      "UNEXPECTED_SITUATION",
      "DID_NOT_KNOW_HOW",
      "INFORMATION_MISSING",
      "OTHER",
    ] as const;
    const questions = reasons.map(followUpQuestionFor);
    expect(new Set(questions).size).toBe(reasons.length);
  });
});
