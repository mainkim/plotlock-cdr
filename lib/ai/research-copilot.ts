import { newId, nowIso } from "../store";
import type { AiToolCall, SourceDocument, SourceLibrary, StudyDraftSpec } from "../types";
import { applyGroundedSuggestions, ensureSourceLibrary, recommendGroundedStimuli } from "./rag";
import { searchOpenAlexWorks, type OpenAlexWorkLite } from "./openalex";
import { expandLineageFromDoi } from "./expand-lineage";

const KO_EN: Array<[string, string]> = [
  ["추천", "recommendation"],
  ["신뢰", "trust"],
  ["설명", "explanation"],
  ["온화", "warm tone"],
  ["출처", "source citation"],
  ["생성형", "generative AI"],
  ["설득", "persuasion"],
  ["수용", "acceptance"],
  ["클릭", "click behavior"],
  ["공정", "fairness"]
];

export function literatureQueryFromPrompt(prompt: string): string {
  const extras = KO_EN.filter(([ko]) => prompt.includes(ko)).map(([, en]) => en);
  const latin = prompt.match(/[A-Za-z][A-Za-z-]{3,}/g) ?? [];
  const parts = [...new Set([...extras, ...latin])];
  if (parts.length) return parts.slice(0, 8).join(" ");
  return "trust explanation recommendation experiment";
}

function workToDoc(work: OpenAlexWorkLite): SourceDocument {
  const abstract = work.abstract?.trim();
  const text =
    abstract ||
    `${work.title}${work.authors ? `\nAuthors: ${work.authors}` : ""}${
      work.year ? `\nYear: ${work.year}` : ""
    }\nOpenAlex: ${work.id}${work.doi ? `\nDOI: ${work.doi}` : ""}\n[Imported via OpenAlex search]`;
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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

function pushTool(spec: StudyDraftSpec, call: AiToolCall) {
  if (!spec.aiMeta) {
    spec.aiMeta = { mode: "tools", note: "", sourcePrompt: spec.researchQuestion, toolCalls: [] };
  }
  spec.aiMeta.toolCalls = [...(spec.aiMeta.toolCalls ?? []), call];
  spec.aiMeta.mode = spec.aiMeta.mode === "template" || spec.aiMeta.mode === "llm" ? "tools" : spec.aiMeta.mode;
}

/**
 * Use live literature tools (OpenAlex search → corpus → RAG stimuli).
 * Never throws: tool failures are recorded on aiMeta.toolCalls.
 */
export async function enrichDraftWithLiterature(
  spec: StudyDraftSpec,
  prompt: string,
  opts?: { searchLimit?: number; expand?: boolean; timeoutMs?: number }
): Promise<StudyDraftSpec> {
  if (process.env.HAEBOM_SKIP_LITERATURE === "1") {
    pushTool(spec, {
      tool: "openalex_search",
      status: "skipped",
      input: prompt,
      outputSummary: "HAEBOM_SKIP_LITERATURE=1"
    });
    return spec;
  }

  const query = literatureQueryFromPrompt(prompt);
  spec.aiMeta = {
    ...(spec.aiMeta ?? { mode: "tools", note: "", sourcePrompt: prompt }),
    literatureQuery: query,
    toolCalls: spec.aiMeta?.toolCalls ?? []
  };

  const library = ensureSourceLibrary(spec);
  const timeoutMs = opts?.timeoutMs ?? 10_000;

  let works: OpenAlexWorkLite[] = [];
  try {
    works = await withTimeout(searchOpenAlexWorks(query, opts?.searchLimit ?? 6), timeoutMs, "OpenAlex search");
    for (const work of works) {
      const dup = library.documents.find(
        (d) => (work.doi && d.doi === work.doi) || (work.id && d.openAlexId === work.id)
      );
      if (!dup) library.documents.push(workToDoc(work));
    }
    pushTool(spec, {
      tool: "openalex_search",
      status: works.length ? "ok" : "skipped",
      input: query,
      outputSummary: works.length
        ? `${works.length}편: ${works
            .slice(0, 3)
            .map((w) => w.title)
            .join(" · ")}`
        : "검색 결과 없음",
      count: works.length
    });
  } catch (e) {
    pushTool(spec, {
      tool: "openalex_search",
      status: "error",
      input: query,
      outputSummary: e instanceof Error ? e.message : String(e)
    });
  }

  const seedDoi = works.find((w) => w.doi)?.doi;
  if (opts?.expand && seedDoi) {
    try {
      const expanded = await withTimeout(
        expandLineageFromDoi(library, seedDoi, { refLimit: 4, citeLimit: 3, similarLimit: 3 }),
        timeoutMs,
        "lineage expand"
      );
      spec.sourceLibrary = expanded.library;
      pushTool(spec, {
        tool: "openalex_expand",
        status: "ok",
        input: seedDoi,
        outputSummary: `+${expanded.added.length}편 · 엣지 ${expanded.edgesAdded}`,
        count: expanded.added.length
      });
      if (expanded.providers.includes("semantic_scholar")) {
        pushTool(spec, {
          tool: "semantic_scholar",
          status: "ok",
          input: seedDoi,
          outputSummary: "유사 논문 추천 반영"
        });
      }
    } catch (e) {
      pushTool(spec, {
        tool: "openalex_expand",
        status: "error",
        input: seedDoi,
        outputSummary: e instanceof Error ? e.message : String(e)
      });
    }
  }

  const preview = recommendGroundedStimuli(spec, prompt);
  pushTool(spec, {
    tool: "rag_retrieve",
    status: preview.retrieved.length ? "ok" : "skipped",
    input: prompt.slice(0, 180),
    outputSummary: preview.note,
    count: preview.retrieved.length
  });

  if (preview.suggestions.length) {
    const grounded = applyGroundedSuggestions(spec, preview.suggestions);
    Object.assign(spec, grounded);
    pushTool(spec, {
      tool: "rag_ground_stimuli",
      status: "ok",
      input: `${preview.suggestions.length} conditions`,
      outputSummary: `조건 ${preview.suggestions.length}개 자극을 코퍼스 문단으로 작성`,
      count: preview.suggestions.length
    });
    spec.aiMeta = {
      ...spec.aiMeta!,
      mode: "rag_grounded",
      note: `OpenAlex 문헌 ${library.documents.length}편을 검색해 RAG로 자극을 만들었습니다. 타당성·IRB는 보장하지 않습니다.`,
      literatureQuery: query,
      toolCalls: spec.aiMeta?.toolCalls
    };
  } else {
    spec.aiMeta = {
      ...spec.aiMeta!,
      mode: spec.aiMeta?.toolCalls?.some((c) => c.status === "ok") ? "tools" : spec.aiMeta?.mode ?? "tools",
      note: `${spec.aiMeta?.note ?? ""} OpenAlex 검색어: ${query}. 자료가 부족하면 자극은 템플릿을 유지합니다.`.trim(),
      literatureQuery: query
    };
  }

  return spec;
}

export function mergeWorksIntoLibrary(library: SourceLibrary, works: OpenAlexWorkLite[]): SourceDocument[] {
  const added: SourceDocument[] = [];
  for (const work of works) {
    const dup = library.documents.find(
      (d) => (work.doi && d.doi === work.doi) || (work.id && d.openAlexId === work.id)
    );
    if (dup) continue;
    const doc = workToDoc(work);
    library.documents.push(doc);
    added.push(doc);
  }
  return added;
}
