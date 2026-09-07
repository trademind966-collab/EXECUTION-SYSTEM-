import { describe, it, expect } from "vitest";
import { analyzeGap } from "@/lib/engines/gapAnalysis";

describe("analyzeGap (rule-based fallback, no OPENAI_API_KEY)", () => {
  it("never labels the user negatively and flags missing info as a follow-up need", async () => {
    const result = await analyzeGap({ title: "Learn to code" });

    expect(result.generatedByAi).toBe(false);
    const allText = Object.values(result).join(" ").toLowerCase();
    for (const badWord of ["lazy", "undisciplined", "weak", "mentally ill"]) {
      expect(allText).not.toContain(badWord);
    }
    expect(result.knowledgeGap).toMatch(/not enough information|follow-up/i);
  });

  it("references the user's own stated blocker in the execution gap", async () => {
    const result = await analyzeGap({
      title: "Launch a podcast",
      blockers: "I keep procrastinating on episode 1",
    });
    expect(result.executionGap).toContain("I keep procrastinating on episode 1");
  });
});
