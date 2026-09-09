import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { expandLineageFromDoi } from "../lib/ai/expand-lineage";
import { normalizeDoi } from "../lib/ai/openalex";
import type { SourceLibrary } from "../lib/types";

const SEED_DOI = "10.1037/0022-3514.51.6.1173";
const SEED_OA = "https://openalex.org/W2136270727";
const REF_OA = "https://openalex.org/W1111111111";
const CITE_OA = "https://openalex.org/W2222222222";

function emptyLibrary(): SourceLibrary {
  return { documents: [], edges: [], groundingMode: "rag_corpus_only" };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("normalizeDoi", () => {
  it("strips doi.org prefix", () => {
    assert.equal(normalizeDoi("https://doi.org/10.1234/AbC"), "10.1234/abc");
    assert.equal(normalizeDoi("doi:10.1234/x"), "10.1234/x");
  });
});

describe("expandLineageFromDoi", () => {
  const originalFetch = globalThis.fetch;

  before(() => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("api.openalex.org/works/doi:")) {
        return jsonResponse({
          id: SEED_OA,
          doi: `https://doi.org/${SEED_DOI}`,
          display_name: "Seed Paper",
          publication_year: 1986,
          authorships: [{ author: { display_name: "Seed Author" } }],
          abstract_inverted_index: { Trust: [0], cue: [1] },
          cited_by_count: 100,
          referenced_works: [REF_OA]
        });
      }
      if (url.includes("api.openalex.org/works?") && url.includes("openalex_id")) {
        return jsonResponse({
          results: [
            {
              id: REF_OA,
              doi: "https://doi.org/10.1111/ref.1",
              display_name: "Reference Paper",
              publication_year: 1980,
              authorships: [{ author: { display_name: "Ref Author" } }],
              cited_by_count: 50,
              referenced_works: []
            }
          ]
        });
      }
      if (url.includes("api.openalex.org/works?") && url.includes("cites:")) {
        return jsonResponse({
          results: [
            {
              id: CITE_OA,
              doi: "https://doi.org/10.1111/cite.1",
              display_name: "Citing Paper",
              publication_year: 1990,
              authorships: [{ author: { display_name: "Cite Author" } }],
              cited_by_count: 10,
              referenced_works: []
            }
          ]
        });
      }
      if (url.includes("semanticscholar.org/graph/v1/paper/DOI:")) {
        return jsonResponse({
          paperId: "S2SEED",
          title: "Seed Paper",
          year: 1986,
          authors: [{ name: "Seed Author" }],
          abstract: "Trust cue abstract",
          citationCount: 100,
          externalIds: { DOI: SEED_DOI }
        });
      }
      if (url.includes("semanticscholar.org/recommendations/v1/papers/forpaper/")) {
        return jsonResponse({
          recommendedPapers: [
            {
              paperId: "S2SIM",
              title: "Similar Paper",
              year: 2010,
              authors: [{ name: "Sim Author" }],
              abstract: "Similar abstract",
              citationCount: 5,
              externalIds: { DOI: "10.1111/sim.1" }
            }
          ]
        });
      }
      return jsonResponse({ error: `unmocked ${url}` }, 500);
    }) as typeof fetch;
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  it("imports seed, refs, citers, and similar papers into lineage", async () => {
    const result = await expandLineageFromDoi(emptyLibrary(), SEED_DOI, {
      refLimit: 4,
      citeLimit: 4,
      similarLimit: 4
    });
    assert.equal(result.seed.title, "Seed Paper");
    assert.ok(result.providers.includes("openalex"));
    assert.ok(result.providers.includes("semantic_scholar"));
    assert.ok(result.added.length >= 3);
    assert.ok(result.edgesAdded >= 2);
    assert.ok(result.library.documents.some((d) => d.title === "Reference Paper"));
    assert.ok(result.library.documents.some((d) => d.title === "Citing Paper"));
    assert.ok(result.library.documents.some((d) => d.title === "Similar Paper"));
    assert.ok(result.library.edges.some((e) => e.relation === "cites"));
    assert.ok(result.library.edges.some((e) => e.relation === "related"));
  });

  it("is idempotent on second expand of same DOI", async () => {
    const first = await expandLineageFromDoi(emptyLibrary(), SEED_DOI);
    const second = await expandLineageFromDoi(first.library, SEED_DOI);
    assert.equal(second.added.length, 0);
    assert.equal(second.library.documents.length, first.library.documents.length);
  });
});
