import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateStudyDraft, DEMO_PROMPT } from "../lib/ai/generator";
import { addMissingRecommendationSelect, compareConditions, runQa } from "../lib/qa";
import { assignCondition } from "../lib/assignment";
import type { StudyVersion } from "../lib/types";

describe("AI generator", () => {
  it("builds 2x2 structured draft from demo prompt", async () => {
    const draft = await generateStudyDraft(DEMO_PROMPT);
    assert.equal(draft.conditions.length, 4);
    assert.equal(draft.design.factors.length, 2);
    assert.ok(draft.reviewRequired.some((r) => r.field === "irbStatus"));
    assert.ok(draft.stimuli.every((s) => s.criteriaButtonLabel.includes("선정 기준")));
  });
});

describe("QA + condition compare", () => {
  it("flags missing recommendation select and CTA drift", async () => {
    const draft = await generateStudyDraft(DEMO_PROMPT);
    const qa = runQa(draft);
    assert.ok(qa.blockers.some((b) => b.code === "BEHAVIOR_MISSING"));
    assert.ok(qa.measurementMap.some((m) => m.construct === "추천 선택" && m.status === "missing"));
    const diffs = compareConditions(draft);
    assert.ok(diffs.some((d) => d.field === "ctaLabel"));
    const fixed = addMissingRecommendationSelect(draft);
    const qa2 = runQa(fixed);
    assert.ok(!qa2.blockers.some((b) => b.code === "BEHAVIOR_MISSING"));
  });
});

describe("assignment", () => {
  it("balances conditions server-side", async () => {
    const draft = await generateStudyDraft(DEMO_PROMPT);
    const version: StudyVersion = {
      id: "ver_test",
      studyId: "stu_test",
      versionNumber: 1,
      status: "published",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      spec: draft
    };
    const assignments = [];
    for (let i = 0; i < 40; i++) {
      const a = assignCondition({
        studyId: "stu_test",
        studyVersionId: "ver_test",
        participantId: `par_${i}`,
        version,
        existingAssignments: assignments,
        targetN: 80
      });
      assignments.push(a);
    }
    const counts = Object.fromEntries(draft.conditions.map((c) => [c.id, 0]));
    for (const a of assignments) counts[a.conditionId] += 1;
    const values = Object.values(counts);
    assert.equal(Math.max(...values) - Math.min(...values) <= 1, true);
  });
});
