import { withDbRead } from "./store";
import type { Study, StudyVersion } from "./types";

/**
 * Public participant catalog.
 * Published studies that are not marked private.
 * The card is the join handle plus participant-facing copy.
 * It must not include hypotheses, conditions, counts, or researcher email.
 */
export type OpenStudyCard = {
  id: string;
  title: string;
  joinCode: string;
  description?: string;
  estimatedMinutes?: number;
};

export function openStudyCard(study: Study, version: StudyVersion | undefined): OpenStudyCard | null {
  if (study.status !== "published") return null;
  if (study.listing === "private") return null;
  if (!version || version.id !== study.currentVersionId || version.status !== "published") return null;

  const card: OpenStudyCard = {
    id: study.id,
    title: study.title,
    joinCode: study.joinCode
  };
  const description = study.publicDescription?.trim();
  if (description) card.description = description.slice(0, 200);
  if (Number.isInteger(study.estimatedMinutes) && (study.estimatedMinutes ?? 0) > 0) {
    card.estimatedMinutes = study.estimatedMinutes;
  }
  return card;
}

export function listOpenStudies(): OpenStudyCard[] {
  return withDbRead((db) => {
    const cards: OpenStudyCard[] = [];
    const studies = [...db.studies].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    for (const study of studies) {
      const version = db.versions.find((item) => item.id === study.currentVersionId);
      const card = openStudyCard(study, version);
      if (card) cards.push(card);
    }
    return cards;
  });
}
