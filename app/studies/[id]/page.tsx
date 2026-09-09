"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Circle,
  FlaskConical,
  MessageCircle,
  MoreHorizontal,
  Play,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LineageExplorer } from "@/components/LineageExplorer";
import { api } from "@/lib/client-api";
import type { ConditionDiffWarning, QaReport, Study, StudyVersion, AiToolCall } from "@/lib/types";

type LineageGraph = {
  nodes: Array<{
    id: string;
    title: string;
    authors?: string;
    year?: number;
    kind: string;
    shortLabel?: string;
    collectionId?: string;
    color?: string;
    r?: number;
    isFocus?: boolean;
    x: number;
    y: number;
  }>;
  edges: Array<{
    id: string;
    fromSourceId: string;
    toSourceId: string;
    relation: string;
    note?: string;
  }>;
  focusId?: string;
  width?: number;
  height?: number;
};

type Bundle = {
  study: Study;
  versions: StudyVersion[];
  current?: StudyVersion;
  draft?: StudyVersion;
  diffs: ConditionDiffWarning[];
  qa: QaReport;
};

const TABS = [
  { id: "design", label: "AI 연구 브리프" },
  { id: "sources", label: "자료·계보 (RAG)" },
  { id: "conditions", label: "조건·자극" },
  { id: "stimuli", label: "자극 편집" },
  { id: "survey", label: "설문" },
  { id: "behavior", label: "행동 측정" },
  { id: "qa", label: "측정 설계" },
  { id: "publish", label: "검토·승인" },
  { id: "recruit", label: "모집·실행" }
] as const;

function StudyPageInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const tab = search.get("tab") || "design";
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lineage, setLineage] = useState<LineageGraph | null>(null);
  const [sourceForm, setSourceForm] = useState({
    title: "",
    authors: "",
    year: "",
    text: "",
    citesSourceId: ""
  });
  const [doiExpand, setDoiExpand] = useState("");
  const [litQuery, setLitQuery] = useState("");
  const [groundQuery, setGroundQuery] = useState("");
  const [groundPreview, setGroundPreview] = useState<{
    note: string;
    retrieved: Array<{ sourceTitle: string; excerpt: string }>;
    suggestions: Array<{ conditionId: string; body: string; citations: Array<{ sourceTitle: string }> }>;
  } | null>(null);

  const load = useCallback(async () => {
    const data = await api<Bundle>("get_bundle", { studyId: params.id });
    setBundle(data);
    try {
      const lin = await api<{ graph: LineageGraph }>("lineage", { studyId: params.id });
      setLineage(lin.graph);
    } catch {
      setLineage(null);
    }
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setBundle(null);
    load()
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const version = bundle?.draft ?? bundle?.current;
  const spec = version?.spec;

  const setTab = (id: string) => router.push(`/studies/${params.id}?tab=${id}`);

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api(action, { studyId: params.id, ...extra });
      await load();
      if (action === "publish") {
        const joinCode = (result as { joinCode?: string }).joinCode;
        setNotice(`Published · 참여 코드 ${joinCode}`);
      } else if (action === "expand_lineage") {
        const r = result as {
          addedCount?: number;
          edgesAdded?: number;
          providers?: string[];
          warnings?: string[];
          seed?: { title?: string };
        };
        const warn = r.warnings?.length ? ` · 경고 ${r.warnings.length}` : "";
        setNotice(
          `계보 확장: ${r.seed?.title ?? "논문"} · +${r.addedCount ?? 0}편 · 엣지 ${r.edgesAdded ?? 0} (${(r.providers ?? []).join(", ") || "—"})${warn}`
        );
      } else if (action === "search_literature") {
        const r = result as { found?: number; query?: string };
        setNotice(`OpenAlex 검색 “${r.query ?? ""}” · 결과 ${r.found ?? 0}편`);
      } else if (action === "run_literature_copilot") {
        const r = result as { papers?: number; toolCalls?: AiToolCall[] };
        const ok = (r.toolCalls ?? []).filter((c) => c.status === "ok").length;
        setNotice(`문헌 코파일럿: 자료 ${r.papers ?? 0}편 · 도구 ${ok}건 성공`);
      } else {
        setNotice("저장되었습니다.");
      }
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy(false);
    }
  }

  const changedCta = useMemo(() => {
    if (!spec) return new Set<string>();
    const ctas = new Set(spec.stimuli.map((s) => s.ctaLabel));
    if (ctas.size <= 1) return new Set<string>();
    return new Set(spec.stimuli.filter((s) => s.ctaLabel !== spec.stimuli[0].ctaLabel).map((s) => s.id));
  }, [spec]);

  if (!bundle || !spec || !version) {
    return (
      <AppShell studyId={params.id}>
        <div className="panel">
          {error ? (
            <>
              <div className="alert alert-danger">{error}</div>
              <button className="primary-btn" type="button" onClick={() => load().catch((e) => setError(e.message))}>
                다시 불러오기
              </button>
            </>
          ) : (
            "불러오는 중…"
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell studyId={bundle.study.id} joinCode={bundle.study.joinCode}>
      <div className="workspace-head">
        <div>
          <span className={`pill ${version.status === "published" ? "mint" : version.status === "review" || version.status === "approved" ? "amber" : "blue"}`}>
            {version.status === "published" ? "실행 중" : version.status === "approved" ? "승인됨" : version.status === "review" ? "검토 중" : "AI 초안"}
          </span>
          <h1>{bundle.study.title}</h1>
          <p>
            Study · v{version.versionNumber}
            {bundle.study.isDemo ? " · DEMO" : ""} · 의도한 조작과 측정이 데이터까지 이어졌는지 확인하세요.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link className="outline-btn" href={`/studies/${bundle.study.id}/data`}>
              데이터
            </Link>
            <Link className="primary-btn" href={`/p/${bundle.study.joinCode}`}>
              참여 링크
            </Link>
        </div>
      </div>

      <section className="panel">
        <p className="muted" style={{ margin: 0 }}>
          화면 흐름 · 브리프 → 조건·자극 → 측정 → 검토·승인 → 모집·실행
        </p>
        <div className="steps">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`step-chip ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
        {notice ? <div className="alert alert-ok">{notice}</div> : null}
        {error ? <div className="alert alert-danger">{error}</div> : null}
      </section>

      {tab === "design" && (
        <section className="panel">
          <h3>연구 설계 확인</h3>
          <p>
            <strong>RQ</strong> {spec.researchQuestion}
          </p>
          <ul>
            {spec.hypotheses.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <p className="muted">
            설계: {spec.design.type} · factors{" "}
            {spec.design.factors.map((f) => `${f.name}(${f.levels.map((l) => l.label).join("/")})`).join(" × ")}
          </p>
          <div className="alert alert-warn">
            AI 메모: {spec.aiMeta?.note || "초안입니다. 타당성을 보장하지 않습니다."}
          </div>
          {spec.aiMeta?.literatureQuery ? (
            <p className="muted">OpenAlex 검색어: {spec.aiMeta.literatureQuery}</p>
          ) : null}
          {(spec.aiMeta?.toolCalls?.length ?? 0) > 0 ? (
            <div className="tool-trace" style={{ margin: "16px 0" }}>
              <h3 style={{ marginTop: 0 }}>AI 도구 사용</h3>
              <p className="muted" style={{ marginTop: 0 }}>
                템플릿만 쓰지 않고 OpenAlex·RAG를 호출한 기록입니다.
              </p>
              <ul className="tool-trace-list">
                {(spec.aiMeta?.toolCalls ?? []).map((call, i) => (
                  <li key={`${call.tool}-${i}`}>
                    <span className={`pill ${call.status === "ok" ? "mint" : call.status === "error" ? "amber" : "gray"}`}>
                      {call.tool}
                    </span>
                    <div>
                      <strong>{call.status}</strong>
                      <p className="muted" style={{ margin: "4px 0 0" }}>
                        {call.input}
                      </p>
                      <p style={{ margin: "4px 0 0" }}>{call.outputSummary}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="alert alert-ok">
              문헌 도구를 아직 쓰지 않았습니다. 자료·계보 탭에서 OpenAlex 검색 또는 문헌 코파일럿을 실행하세요.
            </div>
          )}
          <h3>reviewRequired</h3>
          <ul>
            {spec.reviewRequired.map((r) => (
              <li key={r.field}>
                <strong>{r.field}</strong> — {r.reason} → {r.suggestedAction}
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="outline-btn"
              type="button"
              disabled={busy}
              onClick={() => run("run_literature_copilot", { query: spec.aiMeta?.sourcePrompt })}
            >
              문헌 코파일럿 다시 실행
            </button>
            <button className="primary-btn" type="button" onClick={() => setTab("sources")}>
              자료·계보 (RAG)로 이동 →
            </button>
          </div>
        </section>
      )}

      {tab === "sources" && (
        <section className="panel">
          <div className="workspace-head" style={{ padding: 0, marginBottom: 12 }}>
            <div>
              <span className="pill blue">RAG · 자료 기반 생성</span>
              <h2 style={{ margin: "8px 0 4px" }}>노트북 LLM처럼, 넣은 자료만 근거로 씁니다</h2>
              <p className="muted" style={{ margin: 0 }}>
                Retrieval-Augmented Generation (그라운디드 생성). 코퍼스 밖 지식으로 자극을 만들지 않습니다.
                계보는 OpenAlex·Semantic Scholar로 DOI 주변 논문을 확장합니다.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="outline-btn"
                type="button"
                disabled={busy}
                onClick={() => run("seed_source_library")}
              >
                데모 논문 시드
              </button>
              <button
                className="outline-btn"
                type="button"
                disabled={busy}
                onClick={() => run("run_literature_copilot", { query: groundQuery || spec.aiMeta?.sourcePrompt })}
              >
                문헌 코파일럿
              </button>
              <button className="primary-btn" type="button" onClick={() => setTab("conditions")}>
                조건·자극으로 →
              </button>
            </div>
          </div>

          <div className="checklist-card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>키워드로 문헌 검색 (OpenAlex)</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              DOI가 없어도 연구 질문으로 논문을 찾아 자료실에 넣습니다.
            </p>
            <div className="field" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label style={{ flex: "1 1 240px", marginBottom: 0 }}>
                검색어
                <input
                  value={litQuery}
                  onChange={(e) => setLitQuery(e.target.value)}
                  placeholder="recommendation explanation trust"
                />
              </label>
              <button
                className="primary-btn"
                type="button"
                disabled={busy || !litQuery.trim()}
                onClick={() => run("search_literature", { query: litQuery.trim() })}
              >
                OpenAlex 검색
              </button>
            </div>
          </div>

          <div className="checklist-card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>DOI로 계보 확장 (OpenAlex + Semantic Scholar)</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              시드 논문의 참고문헌·피인용·유사 논문을 자료실에 넣고 인용 그래프를 연결합니다.
            </p>
            <div className="field" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label style={{ flex: "1 1 240px", marginBottom: 0 }}>
                DOI
                <input
                  value={doiExpand}
                  onChange={(e) => setDoiExpand(e.target.value)}
                  placeholder="10.1037/0022-3514.51.6.1173"
                />
              </label>
              <button
                className="primary-btn"
                type="button"
                disabled={busy || !doiExpand.trim()}
                onClick={() => run("expand_lineage", { doi: doiExpand.trim() })}
              >
                계보 가져오기
              </button>
            </div>
          </div>

          <div className="grid-2" style={{ gap: 16 }}>
            <div className="checklist-card">
              <h3 style={{ marginTop: 0 }}>자료 추가</h3>
              <div className="field">
                <label>
                  제목
                  <input
                    value={sourceForm.title}
                    onChange={(e) => setSourceForm((s) => ({ ...s, title: e.target.value }))}
                    placeholder="논문/계획서 제목"
                  />
                </label>
                <label>
                  저자
                  <input
                    value={sourceForm.authors}
                    onChange={(e) => setSourceForm((s) => ({ ...s, authors: e.target.value }))}
                    placeholder="예: Kim & Lee"
                  />
                </label>
                <label>
                  연도
                  <input
                    value={sourceForm.year}
                    onChange={(e) => setSourceForm((s) => ({ ...s, year: e.target.value }))}
                    placeholder="2024"
                  />
                </label>
                <label>
                  이 자료가 인용하는 기존 자료
                  <select
                    value={sourceForm.citesSourceId}
                    onChange={(e) => setSourceForm((s) => ({ ...s, citesSourceId: e.target.value }))}
                  >
                    <option value="">(선택 안 함)</option>
                    {(spec.sourceLibrary?.documents ?? []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  원문 / 요약 붙여넣기
                  <textarea
                    value={sourceForm.text}
                    onChange={(e) => setSourceForm((s) => ({ ...s, text: e.target.value }))}
                    placeholder="PDF 텍스트·초록·노트를 붙여넣으세요. 이 내용만 검색 근거가 됩니다."
                  />
                </label>
              </div>
              <button
                className="primary-btn"
                type="button"
                disabled={busy || !sourceForm.text.trim()}
                onClick={async () => {
                  await run("add_source", {
                    title: sourceForm.title || "붙여넣은 자료",
                    authors: sourceForm.authors || undefined,
                    year: sourceForm.year ? Number(sourceForm.year) : undefined,
                    kind: "paper",
                    text: sourceForm.text,
                    citesSourceIds: sourceForm.citesSourceId ? [sourceForm.citesSourceId] : []
                  });
                  setSourceForm({ title: "", authors: "", year: "", text: "", citesSourceId: "" });
                }}
              >
                자료실에 추가
              </button>
            </div>

            <div className="checklist-card">
              <h3 style={{ marginTop: 0 }}>
                자료실 ({spec.sourceLibrary?.documents?.length ?? 0})
              </h3>
              {!(spec.sourceLibrary?.documents?.length) ? (
                <p className="muted">아직 자료가 없습니다. 데모 시드나 붙여넣기로 시작하세요.</p>
              ) : (
                <ul className="source-list">
                  {(spec.sourceLibrary?.documents ?? []).map((d) => (
                    <li key={d.id}>
                      <div>
                        <strong>{d.title}</strong>
                        <p>
                          {[d.authors, d.year].filter(Boolean).join(" · ")} · {d.kind}
                          {d.doi ? ` · DOI ${d.doi}` : ""}
                          {typeof d.citedByCount === "number" ? ` · cited ${d.citedByCount}` : ""}
                        </p>
                      </div>
                      <button
                        className="outline-btn"
                        type="button"
                        style={{ height: 32 }}
                        disabled={busy}
                        onClick={() => run("remove_source", { sourceId: d.id })}
                      >
                        삭제
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lineage-demo-block" style={{ marginTop: 16 }}>
            <LineageExplorer
              library={spec.sourceLibrary ?? { documents: [], edges: [], groundingMode: "rag_corpus_only" }}
              graph={lineage}
            />
            {(spec.sourceLibrary?.documents?.length ?? 0) >= 2 ? (
              <div className="field" style={{ marginTop: 12 }}>
                <label>
                  인용 링크 추가 (from → to)
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select id="link-from" defaultValue="">
                      <option value="" disabled>
                        인용하는 쪽
                      </option>
                      {(spec.sourceLibrary?.documents ?? []).map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title.slice(0, 40)}
                        </option>
                      ))}
                    </select>
                    <select id="link-to" defaultValue="">
                      <option value="" disabled>
                        인용되는 쪽
                      </option>
                      {(spec.sourceLibrary?.documents ?? []).map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title.slice(0, 40)}
                        </option>
                      ))}
                    </select>
                    <button
                      className="outline-btn"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const from = (document.getElementById("link-from") as HTMLSelectElement)?.value;
                        const to = (document.getElementById("link-to") as HTMLSelectElement)?.value;
                        if (from && to) void run("link_sources", { fromSourceId: from, toSourceId: to });
                      }}
                    >
                      계보에 연결
                    </button>
                  </div>
                </label>
              </div>
            ) : null}
          </div>

          <div className="composer-card" style={{ marginTop: 16 }}>
            <div className="ai-orb">
              <Sparkles size={21} />
            </div>
            <div className="composer-copy">
              <strong>자료 기반 자극 추천 (Grounded)</strong>
              <span>검색된 문단만 사용해 조건별 자극 초안을 만듭니다. 코퍼스에 없으면 거절합니다.</span>
            </div>
            <textarea
              aria-label="그라운딩 질의"
              value={groundQuery}
              onChange={(e) => setGroundQuery(e.target.value)}
              placeholder="예: 추천 이유 제시가 신뢰에 미치는 영향"
              style={{ gridColumn: "1 / -1", minHeight: 72 }}
            />
            <div className="upload-row">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const preview = await api<{
                      note: string;
                      retrieved: Array<{ sourceTitle: string; excerpt: string }>;
                      suggestions: Array<{
                        conditionId: string;
                        body: string;
                        citations: Array<{ sourceTitle: string }>;
                      }>;
                    }>("preview_grounded_stimuli", {
                      studyId: params.id,
                      query: groundQuery || undefined
                    });
                    setGroundPreview(preview);
                    setNotice(preview.note);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "실패");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                미리보기
              </button>
              <button
                className="primary"
                type="button"
                disabled={busy}
                onClick={async () => {
                  await run("apply_grounded_stimuli", { query: groundQuery || undefined });
                  setTab("conditions");
                }}
              >
                자극에 적용
              </button>
            </div>
          </div>

          {groundPreview ? (
            <div className="panel" style={{ marginTop: 16 }}>
              <h3>검색된 근거</h3>
              {groundPreview.retrieved.map((r, i) => (
                <div key={`${r.sourceTitle}-${i}`} className="alert alert-ok">
                  <strong>{r.sourceTitle}</strong>
                  <div className="muted" style={{ marginTop: 4 }}>
                    {r.excerpt}
                  </div>
                </div>
              ))}
              <h3>조건별 초안</h3>
              {groundPreview.suggestions.map((s) => (
                <div key={s.conditionId} className="condition-card" style={{ marginBottom: 8 }}>
                  <strong>{s.conditionId}</strong>
                  <p style={{ whiteSpace: "pre-wrap" }}>{s.body}</p>
                  <p className="muted" style={{ fontSize: 12 }}>
                    cites: {s.citations.map((c) => c.sourceTitle).join(" · ") || "—"}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      )}

      {tab === "conditions" && (
        <section className="panel studio-panel">
          <div className="workspace-head" style={{ marginBottom: 8, padding: 0 }}>
            <div>
              <span className="pill blue">조건·자극 스튜디오</span>
              <h2 style={{ margin: "8px 0 4px" }}>의도한 차이만 남았는지 확인하세요</h2>
              <p className="muted" style={{ margin: 0 }}>
                양적 실험 · {spec.design.factors.map((f) => f.levels.length).join(" × ")} 집단 간 설계
              </p>
            </div>
            <button className="primary-btn" type="button" onClick={() => setTab("qa")}>
              측정 설계로 이동 →
            </button>
          </div>

          {bundle.diffs.map((d) => (
            <div key={d.field} className="alert alert-warn">
              {d.message}
            </div>
          ))}

          <div className="condition-grid studio-grid">
            {spec.conditions.map((c) => {
              const stim = spec.stimuli.find((s) => s.conditionId === c.id)!;
              const warn = changedCta.has(stim.id);
              const levelLabels = Object.entries(c.factorLevels).map(([fid, lid]) => {
                const f = spec.design.factors.find((x) => x.id === fid);
                const l = f?.levels.find((x) => x.id === lid);
                return { factor: f?.name ?? fid, label: l?.label ?? lid };
              });
              return (
                <div key={c.id} className={`condition-card studio-card ${warn ? "warn" : ""}`}>
                  <div className="studio-card-top">
                    <strong>{c.label}</strong>
                    <MoreHorizontal size={16} className="muted" />
                  </div>
                  <div className="factor-pills">
                    {levelLabels.map((lv) => (
                      <span
                        key={lv.factor}
                        className={`pill ${lv.label.includes("없") || lv.label.toLowerCase().includes("no") || lv.label.includes("비제공") ? "gray" : "mint"}`}
                      >
                        {lv.factor}: {lv.label}
                      </span>
                    ))}
                  </div>
                  <div className="stimulus-stage ai-answer-block">
                    <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                      {stim.title || "자극 미리보기"}
                    </div>
                    <p style={{ margin: "0 0 8px" }}>{stim.body}</p>
                    {stim.reasonShown && stim.reasonText ? (
                      <p className="highlight cite-line">{stim.reasonText}</p>
                    ) : (
                      <p className="muted" style={{ fontSize: 12, margin: "0 0 8px" }}>
                        출처/이유 미표시
                      </p>
                    )}
                    <div className={`tone-chip ${stim.tone === "warm" ? "warm" : "neutral"}`}>
                      {stim.tone === "warm" ? "표현: 온화" : "표현: 중립"} · CTA “{stim.ctaLabel}”
                    </div>
                    {(stim.groundedCitations?.length ?? 0) > 0 ? (
                      <p className="muted" style={{ margin: "8px 0 0", fontSize: 12 }}>
                        RAG 근거: {stim.groundedCitations!.map((c) => c.sourceTitle).join(" · ")}
                      </p>
                    ) : null}
                    <p className="muted" style={{ margin: "8px 0 0", fontSize: 12 }}>
                      {stim.criteriaButtonLabel}
                    </p>
                  </div>
                  {warn ? (
                    <span className="diff-chip">의도하지 않은 차이일 수 있습니다. 검토하세요.</span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="studio-footer">
            <div className="studio-check ok">
              <CheckCircle2 size={18} />
              <div>
                <strong>무작위 배정</strong>
                <p>참가자를 {spec.conditions.length}개 조건에 균등 배정합니다.</p>
              </div>
            </div>
            <div className={`studio-check ${bundle.diffs.length || changedCta.size ? "warn" : "ok"}`}>
              {bundle.diffs.length || changedCta.size ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <div>
                <strong>표현·문구 차이</strong>
                <p>
                  {bundle.diffs.length || changedCta.size
                    ? "확신도/CTA 외 표현 차이를 확인하세요."
                    : "조건 간 의도한 조작만 감지되었습니다."}
                </p>
              </div>
            </div>
            <button className="outline-btn" type="button" onClick={() => setTab("stimuli")}>
              차이 상세 보기
            </button>
          </div>
        </section>
      )}

      {tab === "stimuli" && (
        <section className="panel">
          <h3>자극 편집</h3>
          {spec.stimuli.map((stim) => (
            <div key={stim.id} className="field">
              <label>
                {stim.conditionId} · CTA
                <input
                  defaultValue={stim.ctaLabel}
                  onBlur={(e) =>
                    run("update_stimulus", { stimulusId: stim.id, patch: { ctaLabel: e.target.value } })
                  }
                />
              </label>
              <label>
                본문
                <textarea
                  defaultValue={stim.body}
                  onBlur={(e) => run("update_stimulus", { stimulusId: stim.id, patch: { body: e.target.value } })}
                />
              </label>
            </div>
          ))}
          <button className="btn" disabled={busy} onClick={() => run("apply_demo_fixes")}>
            CTA 통일 + 누락 행동측정 추가
          </button>
        </section>
      )}

      {tab === "survey" && (
        <section className="panel">
          <h3>설문 문항</h3>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>구성개념</th>
                <th>문항</th>
                <th>단계</th>
              </tr>
            </thead>
            <tbody>
              {spec.measures.map((m) => (
                <tr key={m.id}>
                  <td className="mono">{m.id}</td>
                  <td>{m.construct}</td>
                  <td>
                    <input
                      defaultValue={m.questionText}
                      style={{ width: "100%" }}
                      onBlur={(e) =>
                        run("update_measure", { measureId: m.id, patch: { questionText: e.target.value } })
                      }
                    />
                  </td>
                  <td>{m.stage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "behavior" && (
        <section className="panel">
          <h3>행동 측정</h3>
          <table className="table">
            <thead>
              <tr>
                <th>이름</th>
                <th>event</th>
                <th>object_id</th>
                <th>필수</th>
              </tr>
            </thead>
            <tbody>
              {spec.behaviorEvents.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td className="mono">{b.eventType}</td>
                  <td className="mono">{b.objectId}</td>
                  <td>{b.required ? "Y" : "N"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "qa" && (
        <section className="panel">
          <h3>Measurement Map</h3>
          <table className="table">
            <thead>
              <tr>
                <th>측정하려는 것</th>
                <th>실제 측정 방식</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {bundle.qa.measurementMap.map((row) => (
                <tr key={row.construct}>
                  <td>{row.construct}</td>
                  <td className="mono">{row.measurementMethod}</td>
                  <td>
                    <span
                      className={`badge ${
                        row.status === "linked" ? "badge-ok" : row.status === "missing" ? "badge-danger" : "badge-warn"
                      }`}
                    >
                      {row.status === "linked" ? "연결됨" : row.status === "missing" ? "누락" : "검토 필요"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ marginTop: "1.2rem" }}>QA · rule-based</h3>
          {bundle.qa.blockers.map((b) => (
            <div key={b.id} className="alert alert-danger">
              [blocker] {b.code}: {b.message}
            </div>
          ))}
          {bundle.qa.warnings.map((b) => (
            <div key={b.id} className="alert alert-warn">
              [warning] {b.code}: {b.message}
            </div>
          ))}

          <h3 style={{ marginTop: "1.2rem" }}>AI review suggestion</h3>
          {bundle.qa.aiSuggestions.map((b) => (
            <div key={b.id} className="alert alert-warn">
              {b.message}
            </div>
          ))}

          <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <button id="qa-fix-btn" className="btn" type="button" disabled={busy} onClick={() => run("apply_demo_fixes")}>
              누락 측정 수정
            </button>
            <button id="qa-goto-publish" className="btn btn-secondary" type="button" disabled={busy} onClick={() => setTab("publish")}>
              승인 단계로
            </button>
          </div>
        </section>
      )}

      {tab === "publish" && (
        <section className="panel">
          <div className="workspace-head" style={{ padding: 0, marginBottom: 12 }}>
            <div>
              <span className="pill amber">게시 전 확인</span>
              <h2 style={{ margin: "8px 0 4px" }}>연구자가 승인한 설계만 실행됩니다</h2>
              <p className="muted" style={{ margin: 0 }}>
                AI 제안, 근거, 윤리 항목을 한 번 더 검토하세요.
              </p>
            </div>
          </div>

          {(() => {
            const checklist = [
              {
                id: "cite",
                done: true,
                label: "선행연구 원문과 인용 일치",
                hint: "연구자 확인 항목 (AI 미확정)"
              },
              {
                id: "scale",
                done: !spec.reviewRequired.some((r) => /scale|척도|번역/i.test(r.field + r.reason)),
                label: "검증 척도와 번역 절차 확인",
                hint: "reviewRequired 척도 항목"
              },
              {
                id: "confound",
                done: !(bundle.diffs.length || changedCta.size),
                label: "조건별 혼입 변인 검토",
                hint: "조건·자극 스튜디오에서 확인"
              },
              {
                id: "n",
                done: !spec.reviewRequired.some((r) => /sample|표본|N\b|target/i.test(r.field + r.reason)),
                label: "표본수 산정 근거 첨부",
                hint: "연구자 책임"
              },
              {
                id: "irb",
                done: !spec.reviewRequired.some((r) => /irb|윤리/i.test(r.field + r.reason)),
                label: "IRB 또는 연구윤리 검토",
                hint: "연구자 책임"
              },
              {
                id: "pii",
                done: true,
                label: "개인정보·민감정보 분리",
                hint: "Participant ID 자동 가명"
              },
              {
                id: "measure",
                done: bundle.qa.canApprove,
                label: "Measurement Map blocker 해소",
                hint: "측정 설계 QA"
              }
            ];
            const doneCount = checklist.filter((c) => c.done).length;
            const pending = checklist.length - doneCount;
            return (
              <div className="approval-layout">
                <div className="checklist-card">
                  <div className="checklist-head">
                    <div className="ai-orb">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <strong>승인 체크리스트</strong>
                      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                        {checklist.length}개 중 {doneCount}개 완료
                      </p>
                    </div>
                  </div>
                  <ul className="checklist">
                    {checklist.map((item) => (
                      <li key={item.id} className={item.done ? "done" : "pending"}>
                        {item.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        <div>
                          <strong>{item.label}</strong>
                          <p>{item.hint}</p>
                        </div>
                        <ChevronRight size={16} className="muted" />
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="approval-card">
                  <FlaskConical size={28} />
                  <span className={`pill ${pending === 0 ? "mint" : "amber"}`}>
                    {pending === 0 ? "승인 가능" : "승인 대기"}
                  </span>
                  <h3>
                    {pending === 0
                      ? "연구앱을 게시할 수 있어요"
                      : `${pending}개 항목을 확인하면 연구앱을 게시할 수 있어요`}
                  </h3>
                  <p>
                    승인 시 현재 설계가 버전 {version.versionNumber}.0으로 고정되고 변경 이력이
                    기록됩니다. AI는 타당성을 보장하지 않습니다.
                  </p>
                  <button
                    className="primary-btn"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (pending > 0) setTab(bundle.qa.canApprove ? "conditions" : "qa");
                      else run("approve");
                    }}
                  >
                    {pending > 0 ? "미완료 항목 확인" : "승인"}
                  </button>
                  <Link className="preview-link" href={`/p/${bundle.study.joinCode}`}>
                    참가자 화면 미리보기 <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })()}

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: 16 }}>
            <button id="btn-submit-review" className="btn btn-secondary" type="button" disabled={busy} onClick={() => run("submit_review")}>
              Review로 제출
            </button>
            <button id="btn-approve" className="btn btn-secondary" type="button" disabled={busy} onClick={() => run("approve")}>
              강제 승인
            </button>
            <button id="btn-publish" className="btn" type="button" disabled={busy} onClick={() => run("publish")}>
              Publish
            </button>
            <button
              className="outline-btn"
              type="button"
              disabled={busy}
              onClick={async () => {
                const result = await run("duplicate");
                const id = (result as { study?: { id: string } })?.study?.id;
                if (id) router.push(`/studies/${id}?tab=design`);
              }}
            >
              연구 복제
            </button>
            {bundle.current?.status === "published" || bundle.study.status === "published" ? (
              <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => run("new_draft")}>
                새 draft version 생성
              </button>
            ) : null}
            <button className="primary-btn" type="button" onClick={() => setTab("recruit")}>
              모집·실행으로 →
            </button>
          </div>
        </section>
      )}

      {tab === "recruit" && (
        <section className="panel">
          <div className="workspace-head" style={{ padding: 0, marginBottom: 16 }}>
            <div>
              <span className="pill mint">연구 유형별 모집 설계</span>
              <h2 style={{ margin: "8px 0 4px" }}>연구 방법에 맞게 참가자를 모집하세요</h2>
              <p className="muted" style={{ margin: 0 }}>
                양적 실험의 배정과 질적 연구의 표집을 구분해 설계합니다.
              </p>
            </div>
            <button
              className="primary-btn"
              type="button"
              disabled={busy || !(bundle.study.status === "published" || version.status === "published")}
              onClick={() => {
                if (bundle.study.status === "published" || version.status === "published") {
                  router.push(`/p/${bundle.study.joinCode}`);
                } else {
                  run("publish").then(() => setTab("recruit"));
                }
              }}
            >
              <Play size={16} />
              {bundle.study.status === "published" || version.status === "published"
                ? "선택한 연구 시작"
                : "Publish 후 시작"}
            </button>
          </div>

          <div className="recruit-grid">
            <div className="recruit-card selected">
              <div className="recruit-card-top">
                <FlaskConical size={22} />
                <span className="pill blue">현재 연구</span>
              </div>
              <h3>무작위 배정</h3>
              <p>참가자를 {spec.design.factors.map((f) => f.levels.length).join(" × ")}의{" "}
                {spec.conditions.length}개 조건 중 하나에 무작위로 균등 배정합니다.</p>
              <dl className="recruit-meta">
                <div>
                  <dt>모집 목표</dt>
                  <dd>{bundle.study.targetN || 80}명</dd>
                </div>
                <div>
                  <dt>배정 방식</dt>
                  <dd>층화 없는 단순 무작위 배정</dd>
                </div>
                <div>
                  <dt>수집 데이터</dt>
                  <dd>설문 + 행동 로그</dd>
                </div>
              </dl>
              <div className="chip-row">
                <span className="chip">조건 균형</span>
                <span className="chip">중복 참여 방지</span>
                <span className="chip">Participant ID</span>
              </div>
            </div>

            <div className="recruit-card muted-card">
              <div className="recruit-card-top">
                <MessageCircle size={22} />
                <button className="outline-btn" type="button" style={{ height: 32, padding: "0 12px" }} disabled>
                  설정
                </button>
              </div>
              <h3>목적표집 · 눈덩이표집</h3>
              <p>연구 질문에 적합한 정보제공자를 선정하고, 추천 연결 과정을 기록합니다.</p>
              <dl className="recruit-meta">
                <div>
                  <dt>표집 후보</dt>
                  <dd>목적 · 눈덩이 · 이론적 표집</dd>
                </div>
                <div>
                  <dt>중단 기준</dt>
                  <dd>자료 포화도 연구자 판단</dd>
                </div>
                <div>
                  <dt>수집 데이터</dt>
                  <dd>인터뷰 · 메모 · 전사</dd>
                </div>
              </dl>
              <div className="chip-row">
                <span className="chip mint-chip">추천 경로 기록</span>
                <span className="chip mint-chip">동의 분리</span>
                <span className="chip mint-chip">연구자 승인</span>
              </div>
            </div>
          </div>

          <div className="recruit-footer">
            <div>
              <Users size={18} />
              <div>
                <strong>공통 배포 채널</strong>
                <p>웹 링크 · QR 코드 · 토스 참여 채널</p>
              </div>
            </div>
            <div>
              <ShieldCheck size={18} />
              <div>
                <strong>개인정보 분리</strong>
                <p>가명 Participant ID 자동 생성</p>
              </div>
            </div>
            <Link className="preview-link" href={`/p/${bundle.study.joinCode}`}>
              참가자 화면 미리보기 <ChevronRight size={14} />
            </Link>
          </div>

          {(bundle.study.status === "published" || version.status === "published") && (
            <div className="url-box" style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <QrCode size={18} />
              <code className="mono" style={{ fontSize: 18, fontWeight: 800 }}>
                {bundle.study.joinCode}
              </code>
              <button
                className="primary-btn"
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/p/${bundle.study.joinCode}`;
                  navigator.clipboard.writeText(url).catch(() => undefined);
                  setNotice(`참여 링크 복사됨: ${url}`);
                }}
              >
                링크 복사
              </button>
              <Link className="outline-btn" href={`/toss?code=${bundle.study.joinCode}`}>
                토스 참여 채널
              </Link>
              <Link className="outline-btn" href={`/studies/${bundle.study.id}/data`}>
                데이터 · Export
              </Link>
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}

export default function StudyPage() {
  return (
    <Suspense>
      <StudyPageInner />
    </Suspense>
  );
}
