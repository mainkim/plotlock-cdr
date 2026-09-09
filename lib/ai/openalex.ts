/** OpenAlex REST helpers — no API key required (mailto polite pool recommended). */

export type OpenAlexWorkLite = {
  id: string; // https://openalex.org/W...
  doi?: string;
  title: string;
  year?: number;
  authors: string;
  abstract?: string;
  citedByCount?: number;
  referencedWorks: string[]; // OpenAlex URLs
};

const MAILTO = process.env.OPENALEX_MAILTO || "haebom-demo@example.com";

function normalizeDoi(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .toLowerCase();
}

function reconstructAbstract(inverted?: Record<string, number[]>): string | undefined {
  if (!inverted || typeof inverted !== "object") return undefined;
  const pairs: Array<[number, string]> = [];
  for (const [word, idxs] of Object.entries(inverted)) {
    for (const i of idxs) pairs.push([i, word]);
  }
  if (!pairs.length) return undefined;
  pairs.sort((a, b) => a[0] - b[0]);
  return pairs.map((p) => p[1]).join(" ");
}

function authorsFrom(authorships: Array<{ author?: { display_name?: string } }> | undefined): string {
  if (!authorships?.length) return "";
  return authorships
    .slice(0, 6)
    .map((a) => a.author?.display_name)
    .filter(Boolean)
    .join(", ");
}

function mapWork(raw: Record<string, unknown>): OpenAlexWorkLite {
  const authorships = raw.authorships as Array<{ author?: { display_name?: string } }> | undefined;
  return {
    id: String(raw.id || ""),
    doi: raw.doi ? String(raw.doi).replace(/^https?:\/\/doi\.org\//i, "") : undefined,
    title: String(raw.display_name || raw.title || "Untitled"),
    year: typeof raw.publication_year === "number" ? raw.publication_year : undefined,
    authors: authorsFrom(authorships),
    abstract: reconstructAbstract(raw.abstract_inverted_index as Record<string, number[]> | undefined),
    citedByCount: typeof raw.cited_by_count === "number" ? raw.cited_by_count : undefined,
    referencedWorks: Array.isArray(raw.referenced_works) ? (raw.referenced_works as string[]) : []
  };
}

async function openAlexGet(path: string): Promise<Record<string, unknown>> {
  const url = path.startsWith("http") ? path : `https://api.openalex.org${path}`;
  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}mailto=${encodeURIComponent(MAILTO)}`, {
    headers: { Accept: "application/json", "User-Agent": `haebom (${MAILTO})` },
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error(`OpenAlex ${res.status}: ${await res.text().then((t) => t.slice(0, 200))}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

export async function fetchOpenAlexWorkByDoi(doi: string): Promise<OpenAlexWorkLite> {
  const clean = normalizeDoi(doi);
  if (!clean) throw new Error("DOI가 비어 있습니다.");
  const raw = await openAlexGet(
    `/works/doi:${encodeURIComponent(clean)}?select=id,doi,display_name,publication_year,authorships,abstract_inverted_index,cited_by_count,referenced_works`
  );
  return mapWork(raw);
}

export async function fetchOpenAlexWorksByIds(ids: string[], limit = 12): Promise<OpenAlexWorkLite[]> {
  const cleaned = ids
    .map((id) => id.replace("https://openalex.org/", ""))
    .filter(Boolean)
    .slice(0, limit);
  if (!cleaned.length) return [];
  const filter = cleaned.map((id) => `openalex_id:${id}`).join("|");
  const raw = await openAlexGet(
    `/works?filter=${encodeURIComponent(filter)}&per-page=${cleaned.length}&select=id,doi,display_name,publication_year,authorships,abstract_inverted_index,cited_by_count,referenced_works`
  );
  const results = (raw.results as Record<string, unknown>[] | undefined) ?? [];
  return results.map(mapWork);
}

/** Keyword / natural-language search (no API key). */
export async function searchOpenAlexWorks(query: string, perPage = 8): Promise<OpenAlexWorkLite[]> {
  const q = query.trim();
  if (!q) return [];
  const raw = await openAlexGet(
    `/works?search=${encodeURIComponent(q)}&per-page=${Math.min(25, Math.max(1, perPage))}&sort=cited_by_count:desc&select=id,doi,display_name,publication_year,authorships,abstract_inverted_index,cited_by_count,referenced_works`
  );
  const results = (raw.results as Record<string, unknown>[] | undefined) ?? [];
  return results.map(mapWork);
}

/** Papers that cite this OpenAlex work id */
export async function fetchOpenAlexCitingWorks(openAlexId: string, perPage = 8): Promise<OpenAlexWorkLite[]> {
  const id = openAlexId.replace("https://openalex.org/", "");
  const raw = await openAlexGet(
    `/works?filter=cites:${encodeURIComponent(id)}&per-page=${perPage}&sort=cited_by_count:desc&select=id,doi,display_name,publication_year,authorships,abstract_inverted_index,cited_by_count,referenced_works`
  );
  const results = (raw.results as Record<string, unknown>[] | undefined) ?? [];
  return results.map(mapWork);
}

export { normalizeDoi };
