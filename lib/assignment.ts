import type { Assignment, Condition, StudyVersion } from "./types";
import { hashSeed, newId, nowIso } from "./store";

/**
 * Server-side equal randomization with capacity awareness.
 * Never use client Math.random() alone.
 */
export function assignCondition(params: {
  studyId: string;
  studyVersionId: string;
  participantId: string;
  version: StudyVersion;
  existingAssignments: Assignment[];
  targetN: number;
}): Assignment {
  const { studyId, studyVersionId, participantId, version, existingAssignments, targetN } = params;
  const conditions = version.spec.conditions;
  if (!conditions.length) {
    throw new Error("No conditions to assign");
  }

  // Persistent: if already assigned for this participant+version, return existing
  const existing = existingAssignments.find(
    (a) => a.participantId === participantId && a.studyVersionId === studyVersionId
  );
  if (existing) return existing;

  const versionAssignments = existingAssignments.filter((a) => a.studyVersionId === studyVersionId);
  const counts = Object.fromEntries(conditions.map((c) => [c.id, 0])) as Record<string, number>;
  for (const a of versionAssignments) {
    counts[a.conditionId] = (counts[a.conditionId] ?? 0) + 1;
  }

  const perConditionCap = Math.ceil(targetN / conditions.length);

  // Prefer least-filled conditions under capacity
  let candidates: Condition[] = conditions.filter((c) => (counts[c.id] ?? 0) < perConditionCap);
  if (!candidates.length) {
    candidates = [...conditions];
  }

  const minCount = Math.min(...candidates.map((c) => counts[c.id] ?? 0));
  candidates = candidates.filter((c) => (counts[c.id] ?? 0) === minCount);

  const seed = hashSeed(studyVersionId, participantId, String(versionAssignments.length), nowIso());
  const seedNum = parseInt(seed.slice(0, 8), 16);
  const picked = candidates[seedNum % candidates.length];

  return {
    id: newId("asg"),
    participantId,
    studyId,
    studyVersionId,
    conditionId: picked.id,
    assignmentAlgorithm: "equal_randomization",
    assignmentSeed: seed,
    assignedAt: nowIso()
  };
}
