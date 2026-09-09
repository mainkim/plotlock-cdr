import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { generateStudyDraft, DEMO_PROMPT } from "../lib/ai/generator";
import { enrichDraftWithLiterature, literatureQueryFromPrompt } from "../lib/ai/research-copilot";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("literatureQueryFromPrompt", () => {
  it("maps Korean research terms to OpenAlex English query", () => {
    const q = literatureQueryFromPrompt("추천 이유를 설명하면 신뢰가 오를까");
    assert.match(q, /recommendation/);
    assert.match(q, /trust/);
    assert.match(q, /explanation/);
  });
});

describe("enrichDraftWithLiterature", () => {
  const originalFetch = globalThis.fetch;
  const originalSkip = process.env.HAEBOM_SKIP_LITERATURE;

  before(() => {
    delete process.env.HAEBOM_SKIP_LITERATURE;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("api.openalex.org/works?") && url.includes("search=")) {
        return jsonResponse({
          results: [
            {
              id: "https://openalex.org/W1",
              doi: "https://doi.org/10.1111/demo.1",
              display_name: "Explanation and trust in recommenders",
              publication_year: 2019,
              authorships: [{ author: { display_name: "Demo Author" } }],
              abstract_inverted_index: { Explanations: [0], increase: [1], trust: [2] },
              cited_by_count: 42,
              referenced_works: []
            }
          ]
        });
      }
      return jsonResponse({ error: `unmocked ${url}` }, 500);
    }) as typeof fetch;
  });

  after(() => {
    globalThis.fetch = originalFetch;
    if (originalSkip === undefined) delete process.env.HAEBOM_SKIP_LITERATURE;
    else process.env.HAEBOM_SKIP_LITERATURE = originalSkip;
  });

  it("searches OpenAlex and records tool calls", async () => {
    const draft = await generateStudyDraft(DEMO_PROMPT);
    const enriched = await enrichDraftWithLiterature(draft, DEMO_PROMPT, { expand: false });
    const search = enriched.aiMeta?.toolCalls?.find((c) => c.tool === "openalex_search");
    assert.equal(search?.status, "ok");
    assert.ok((enriched.sourceLibrary?.documents.length ?? 0) >= 1);
    assert.ok(enriched.aiMeta?.toolCalls?.some((c) => c.tool === "rag_retrieve"));
    assert.ok(enriched.aiMeta?.literatureQuery);
  });
});
