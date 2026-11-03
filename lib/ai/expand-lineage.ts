import { newId, nowIso } from "../store";
import type { LineageEdge, SourceDocument, SourceLibrary } from "../types";
import { addLineageEdge } from "./lineage";
import {
  fetchOpenAlexCitingWorks,
  fetchOpenAlexWorkByDoi,
  fetchOpenAlexWorksByIds,
  normalizeDoi,
  type OpenAlexWorkLite
} from "./openalex";
import { fetchS2PaperByDoi, fetchS2Recommendations, type S2PaperLite } from "./semantic-scholar";

function workToDoc(work: OpenAlexWorkLite, role: "seed" | "reference" | "citation"): SourceDocument {
  const abstract = work.abstract?.trim();
  const text =
    abstract ||
    `${work.title}${work.authors ? `\nAuthors: ${work.authors}` : ""}${
      work.year ? `\nYear: ${work.year}` : ""
    }\nOpenAlex: ${work.id}${work.doi ? `\nDOI: ${work.doi}` : ""}\n[Imported via OpenAlex · ${role}]`;
  return {
    id: newId("src"),
    title: work.title,
    authors: work.authors || undefined,
    year: work.year,
    kind: "paper",
    text,
    addedAt: nowIso(),
    citesSourceIds: [],
    doi: work.doi,
    openAlexId: work.id,
    citedByCount: work.citedByCount
  };
}

function s2ToDoc(paper: S2PaperLite, role: "similar"): SourceDocument {
  const doi = paper.externalIds?.DOI;
  const text =
    paper.abstract?.trim() ||
    `${paper.title}${paper.authors ? `\nAuthors: ${paper.authors}` : ""}${
      paper.year ? `\nYear: ${paper.year}` : ""
    }\nSemantic Scholar: ${paper.paperId}${doi ? `\nDOI: ${doi}` : ""}\n[Imported via Semantic Scholar · ${role}]`;
  return {
    id: newId("src"),
    title: paper.title,
    authors: paper.authors || undefined,
    year: paper.year,
    kind: "paper",
    text,
    addedAt: nowIso(),
    citesSourceIds: [],
    doi,
    semanticScholarId: paper.paperId,
    citedByCount: paper.citationCount
  };
}

function findByDoiOrOpenAlex(library: SourceLibrary, doi?: string, openAlexId?: string) {
  return library.documents.find(
    (d) =>
      (doi && d.doi && normalizeDoi(d.doi) === normalizeDoi(doi)) ||
      (openAlexId && d.openAlexId === openAlexId)
  );
}

/**
 * Expand lineage around a DOI:
 * - OpenAlex: seed + referenced works (backward) + citing works (forward)
 * - Semantic Scholar: similar / recommended papers (ResearchRabbit-like)
 */
export async function expandLineageFromDoi(
  library: SourceLibrary,
  doi: string,
  opts?: { refLimit?: number; citeLimit?: number; similarLimit?: number }
): Promise<{
  library: SourceLibrary;
  seed: SourceDocument;
  added: SourceDocument[];
  edgesAdded: number;
  providers: string[];
  warnings: string[];
}> {
  const refLimit = opts?.refLimit ?? 8;
  const citeLimit = opts?.citeLimit ?? 6;
  const similarLimit = opts?.similarLimit ?? 6;
  const warnings: string[] = [];
  const providers: string[] = [];
  const added: SourceDocument[] = [];
  let edgesAdded = 0;

  const seedWork = await fetchOpenAlexWorkByDoi(doi);
  providers.push("openalex");

  let seedDoc = findByDoiOrOpenAlex(library, seedWork.doi, seedWork.id);
  if (!seedDoc) {
    seedDoc = workToDoc(seedWork, "seed");
    library.documents.push(seedDoc);
    added.push(seedDoc);
  } else {
    seedDoc.openAlexId = seedDoc.openAlexId || seedWork.id;
    seedDoc.doi = seedDoc.doi || seedWork.doi;
    seedDoc.citedByCount = seedWork.citedByCount ?? seedDoc.citedByCount;
    if (!seedDoc.text || seedDoc.text.length < 40) {
      seedDoc.text = workToDoc(seedWork, "seed").text;
    }
  }

  // Backward: references
  const refIds = seedWork.referencedWorks.slice(0, refLimit);
  if (refIds.length) {
    try {
      const refs = await fetchOpenAlexWorksByIds(refIds, refLimit);
      for (const ref of refs) {
        let doc = findByDoiOrOpenAlex(library, ref.doi, ref.id);
        if (!doc) {
          doc = workToDoc(ref, "reference");
          library.documents.push(doc);
          added.push(doc);
        }
        const before = library.edges.length;
        addLineageEdge(library, seedDoc.id, doc.id, "cites", "OpenAlex referenced_works");
        if (library.edges.length > before) edgesAdded += 1;
        seedDoc.citesSourceIds = Array.from(new Set([...(seedDoc.citesSourceIds ?? []), doc.id]));
      }
    } catch (e) {
      warnings.push(`OpenAlex references: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Forward: citing works
  try {
    const citers = await fetchOpenAlexCitingWorks(seedWork.id, citeLimit);
    for (const citer of citers) {
      let doc = findByDoiOrOpenAlex(library, citer.doi, citer.id);
      if (!doc) {
        doc = workToDoc(citer, "citation");
        library.documents.push(doc);
        added.push(doc);
      }
      const before = library.edges.length;
      addLineageEdge(library, doc.id, seedDoc.id, "cites", "OpenAlex cites seed");
      if (library.edges.length > before) edgesAdded += 1;
      doc.citesSourceIds = Array.from(new Set([...(doc.citesSourceIds ?? []), seedDoc.id]));
    }
  } catch (e) {
    warnings.push(`OpenAlex citing works: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Similar papers via Semantic Scholar
  try {
    const s2 = await fetchS2PaperByDoi(seedWork.doi || doi);
    providers.push("semantic_scholar");
    seedDoc.semanticScholarId = seedDoc.semanticScholarId || s2.paperId;
    const similar = await fetchS2Recommendations(s2.paperId, similarLimit);
    for (const paper of similar) {
      const doi2 = paper.externalIds?.DOI;
      let doc =
        (doi2 && findByDoiOrOpenAlex(library, doi2)) ||
        library.documents.find((d) => d.semanticScholarId === paper.paperId);
      if (!doc) {
        doc = s2ToDoc(paper, "similar");
        library.documents.push(doc);
        added.push(doc);
      }
      const before = library.edges.length;
      addLineageEdge(library, seedDoc.id, doc.id, "related", "Semantic Scholar recommendation");
      if (library.edges.length > before) edgesAdded += 1;
    }
  } catch (e) {
    warnings.push(`Semantic Scholar: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { library, seed: seedDoc, added, edgesAdded, providers, warnings };
}

export type { LineageEdge };
