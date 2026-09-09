import { newId, nowIso } from "../store";
import type {
  GroundedCitation,
  GroundedStimulusSuggestion,
  SourceChunk,
  SourceDocument,
  SourceLibrary,
  Stimulus,
  StudyDraftSpec
} from "../types";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "are",
  "was",
  "were",
  "have",
  "has",
  "of",
  "to",
  "in",
  "on",
  "a",
  "an",
  "is",
  "be",
  "as",
  "by",
  "or",
  "at",
  "it",
  "그리고",
  "그러나",
  "또는",
  "대한",
  "에서",
  "으로",
  "이다",
  "있는",
  "없는",
  "한다",
  "했다",
  "위해",
  "통해",
  "같은",
  "이런",
  "그런"
]);

export function emptySourceLibrary(): SourceLibrary {
  return { documents: [], edges: [], groundingMode: "rag_corpus_only" };
}

export function ensureSourceLibrary(spec: StudyDraftSpec): SourceLibrary {
  if (!spec.sourceLibrary) {
    spec.sourceLibrary = emptySourceLibrary();
  }
  if (!spec.sourceLibrary.groundingMode) {
    spec.sourceLibrary.groundingMode = "rag_corpus_only";
  }
  return spec.sourceLibrary;
}

export function getSourceLibrary(spec: StudyDraftSpec): SourceLibrary {
  return spec.sourceLibrary ?? emptySourceLibrary();
}

export function chunkDocument(doc: SourceDocument, maxLen = 420): SourceChunk[] {
  const raw = doc.text.replace(/\r/g, "").trim();
  if (!raw) return [];
  const paragraphs = raw
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: SourceChunk[] = [];
  let buf = "";
  let index = 0;
  const flush = () => {
    const text = buf.trim();
    if (!text) return;
    chunks.push({
      id: `${doc.id}#c${index}`,
      sourceId: doc.id,
      index,
      text
    });
    index += 1;
    buf = "";
  };
  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > maxLen && buf) {
      flush();
    }
    buf = buf ? `${buf}\n\n${p}` : p;
    if (buf.length >= maxLen) flush();
  }
  flush();
  return chunks;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

export function retrieveChunks(
  docs: SourceDocument[],
  query: string,
  topK = 4
): Array<SourceChunk & { score: number; title: string }> {
  const qTokens = tokenize(query);
  if (!qTokens.length || !docs.length) return [];
  const scored: Array<SourceChunk & { score: number; title: string }> = [];
  for (const doc of docs) {
    for (const chunk of chunkDocument(doc)) {
      const cTokens = new Set(tokenize(chunk.text));
      let overlap = 0;
      for (const t of qTokens) if (cTokens.has(t)) overlap += 1;
      // title/author boost
      const titleHits = tokenize(`${doc.title} ${doc.authors ?? ""}`).filter((t) =>
        qTokens.includes(t)
      ).length;
      const score = overlap + titleHits * 0.5;
      if (score > 0) scored.push({ ...chunk, score, title: doc.title });
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

function citationFromChunk(
  chunk: SourceChunk & { title: string },
  docs: SourceDocument[]
): GroundedCitation {
  const doc = docs.find((d) => d.id === chunk.sourceId);
  return {
    sourceId: chunk.sourceId,
    sourceTitle: doc?.title ?? chunk.title,
    chunkId: chunk.id,
    excerpt: chunk.text.slice(0, 220)
  };
}

/**
 * Grounded / RAG stimulus drafting:
 * only uses retrieved corpus excerpts. Never invents facts outside sources.
 */
export function recommendGroundedStimuli(
  spec: StudyDraftSpec,
  query?: string
): {
  suggestions: GroundedStimulusSuggestion[];
  retrieved: GroundedCitation[];
  mode: "rag_corpus_only";
  note: string;
} {
  const library = ensureSourceLibrary(spec);
  const docs = library.documents;
  const q =
    query?.trim() ||
    [spec.researchQuestion, spec.title, ...(spec.hypotheses ?? [])].filter(Boolean).join(" ");

  if (!docs.length) {
    return {
      suggestions: [],
      retrieved: [],
      mode: "rag_corpus_only",
      note: "자료실이 비어 있습니다. 논문/계획서를 먼저 넣어 주세요. (RAG · 자료 기반 생성)"
    };
  }

  const retrievedChunks = retrieveChunks(docs, q, 6);
  const retrieved = retrievedChunks.map((c) => citationFromChunk(c, docs));

  if (!retrievedChunks.length) {
    return {
      suggestions: [],
      retrieved: [],
      mode: "rag_corpus_only",
      note: "업로드한 자료에서 질의와 겹치는 근거 문단을 찾지 못했습니다. 키워드를 바꾸거나 원문을 더 넣어 주세요."
    };
  }

  const primary = retrievedChunks[0];
  const secondary = retrievedChunks[1] ?? retrievedChunks[0];
  const primaryCite = citationFromChunk(primary, docs);
  const secondaryCite = citationFromChunk(secondary, docs);

  const suggestions: GroundedStimulusSuggestion[] = spec.conditions.map((cond, i) => {
    const levels = Object.entries(cond.factorLevels)
      .map(([fid, lid]) => {
        const f = spec.design.factors.find((x) => x.id === fid);
        const l = f?.levels.find((x) => x.id === lid);
        return l?.label ?? lid;
      })
      .join(" · ");

    // Map factor-ish labels to show/hide reason & tone without leaving corpus
    const showReason = /이유|출처|설명|근거|citation|source|reason/i.test(levels);
    const warm = /온화|따뜻|warm|친절/i.test(levels);
    const excerpt = (i % 2 === 0 ? primary : secondary).text.replace(/\s+/g, " ").slice(0, 160);

    return {
      conditionId: cond.id,
      title: "자료 기반 자극 초안",
      body: warm
        ? `아래 내용은 업로드하신 자료의 문장을 바탕으로 부드럽게 풀어 쓴 초안입니다.\n\n「${excerpt}」`
        : `아래 내용은 업로드하신 자료에서 검색된 근거 문단을 바탕으로 한 자극 초안입니다.\n\n「${excerpt}」`,
      reasonShown: showReason,
      reasonText: showReason
        ? `근거: ${primaryCite.sourceTitle} — ${primaryCite.excerpt.slice(0, 120)}`
        : undefined,
      tone: warm ? "warm" : "neutral",
      ctaLabel: "계속하기",
      criteriaDetail: `이 자극은 RAG(자료 기반 생성)로 작성되었습니다. 코퍼스 외 지식은 사용하지 않았습니다. 조건: ${levels}`,
      citations: showReason ? [primaryCite, secondaryCite] : [primaryCite]
    };
  });

  return {
    suggestions,
    retrieved,
    mode: "rag_corpus_only",
    note: "노트북 LLM / RAG: 업로드 자료에서 검색된 문단만 사용해 자극 초안을 만들었습니다. 타당성을 보장하지 않습니다."
  };
}

export function applyGroundedSuggestions(
  spec: StudyDraftSpec,
  suggestions: GroundedStimulusSuggestion[]
): StudyDraftSpec {
  const next = JSON.parse(JSON.stringify(spec)) as StudyDraftSpec;
  const library = ensureSourceLibrary(next);
  library.lastGroundedAt = nowIso();
  for (const s of suggestions) {
    if (s.refusalReason) continue;
    const stim = next.stimuli.find((x) => x.conditionId === s.conditionId);
    if (!stim) continue;
    stim.title = s.title;
    stim.body = s.body;
    stim.tone = s.tone;
    stim.reasonShown = s.reasonShown;
    stim.reasonText = s.reasonText;
    stim.ctaLabel = s.ctaLabel;
    stim.criteriaDetail = s.criteriaDetail;
    stim.groundedCitations = s.citations;
  }
  next.aiMeta = {
    mode: "rag_grounded",
    note: "자극은 업로드 코퍼스 기반 RAG로 갱신되었습니다. 외부 지식/환각 문장은 넣지 않도록 설계되었습니다.",
    sourcePrompt: next.aiMeta?.sourcePrompt ?? next.researchQuestion,
    literatureQuery: next.aiMeta?.literatureQuery,
    toolCalls: next.aiMeta?.toolCalls
  };
  return next;
}

export function makeSourceDocument(input: {
  title: string;
  text: string;
  authors?: string;
  year?: number;
  kind?: SourceDocument["kind"];
  citesSourceIds?: string[];
  doi?: string;
  collectionId?: string;
  venue?: string;
  keywords?: string[];
  literatureType?: SourceDocument["literatureType"];
  citedByCount?: number;
}): SourceDocument {
  return {
    id: newId("src"),
    title: input.title.trim() || "무제 자료",
    authors: input.authors?.trim() || undefined,
    year: input.year,
    kind: input.kind ?? "paper",
    text: input.text.trim(),
    addedAt: nowIso(),
    citesSourceIds: input.citesSourceIds ?? [],
    doi: input.doi,
    collectionId: input.collectionId,
    venue: input.venue,
    keywords: input.keywords,
    literatureType: input.literatureType,
    citedByCount: input.citedByCount
  };
}

export function stimuliCitationSummary(stimuli: Stimulus[]): string {
  const n = stimuli.reduce((acc, s) => acc + (s.groundedCitations?.length ?? 0), 0);
  return n ? `근거 인용 ${n}건` : "근거 인용 없음";
}
