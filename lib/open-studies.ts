import { participantCorsHeaders, participantOriginAllowed } from "./participant-cors";
import { withDbRead } from "./store";
import type { Study, StudyVersion } from "./types";

/**
 * Public participant catalog.
 * Only published studies that are not marked private.
 * The card is the join handle plus participant-facing copy.
 * It must not include hypotheses, conditions, counts, or Toss user ids.
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

export async function listOpenStudies(): Promise<OpenStudyCard[]> {
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

function json(body: unknown, status: number, headers: Headers): Response {
  const next = new Headers(headers);
  next.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers: next });
}

export async function handleOpenStudiesRequest(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  const headers = participantCorsHeaders(origin, undefined, "GET, OPTIONS");
  const allowed = participantOriginAllowed(origin, undefined, req.url);

  if (req.method === "OPTIONS") {
    if (!allowed) return json({ error: "이 출처에서는 볼 수 없습니다." }, 403, headers);
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "GET") return json({ error: "GET만 지원합니다." }, 405, headers);
  if (!allowed) return json({ error: "이 출처에서는 볼 수 없습니다." }, 403, headers);

  const studies = await listOpenStudies();
  return json({ studies }, 200, headers);
}
