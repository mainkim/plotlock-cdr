/** Semantic Scholar Academic Graph — recommendations + citation neighborhood. */

export type S2PaperLite = {
  paperId: string;
  title: string;
  year?: number;
  authors: string;
  abstract?: string;
  citationCount?: number;
  externalIds?: { DOI?: string };
};

const S2_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;

function normalizeDoi(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "");
}

async function s2Get(path: string): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (S2_KEY) headers["x-api-key"] = S2_KEY;
  const res = await fetch(`https://api.semanticscholar.org${path}`, {
    headers,
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error(`Semantic Scholar ${res.status}: ${await res.text().then((t) => t.slice(0, 200))}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

function mapPaper(raw: Record<string, unknown>): S2PaperLite {
  const authors = Array.isArray(raw.authors)
    ? (raw.authors as Array<{ name?: string }>)
        .slice(0, 6)
        .map((a) => a.name)
        .filter(Boolean)
        .join(", ")
    : "";
  return {
    paperId: String(raw.paperId || ""),
    title: String(raw.title || "Untitled"),
    year: typeof raw.year === "number" ? raw.year : undefined,
    authors,
    abstract: raw.abstract ? String(raw.abstract) : undefined,
    citationCount: typeof raw.citationCount === "number" ? raw.citationCount : undefined,
    externalIds: raw.externalIds as { DOI?: string } | undefined
  };
}

export async function fetchS2PaperByDoi(doi: string): Promise<S2PaperLite> {
  const clean = normalizeDoi(doi);
  const raw = await s2Get(
    `/graph/v1/paper/DOI:${encodeURIComponent(clean)}?fields=paperId,title,year,authors,abstract,citationCount,externalIds`
  );
  return mapPaper(raw);
}

/** ResearchRabbit-like "similar papers" via S2 recommendations API */
export async function fetchS2Recommendations(paperId: string, limit = 8): Promise<S2PaperLite[]> {
  const raw = await s2Get(
    `/recommendations/v1/papers/forpaper/${encodeURIComponent(paperId)}?limit=${limit}&fields=paperId,title,year,authors,abstract,citationCount,externalIds`
  );
  const recommended = (raw.recommendedPapers as Record<string, unknown>[] | undefined) ?? [];
  return recommended.map(mapPaper);
}
