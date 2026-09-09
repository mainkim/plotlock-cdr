"use client";

import { useMemo, useState } from "react";
import { Expand, Hand, Minus, MousePointer2, Plus, RotateCcw } from "lucide-react";
import type { LineageEdge, SourceDocument, SourceLibrary } from "@/lib/types";

function neighborIds(edges: LineageEdge[], id: string, mode: "refs" | "citers" | "similar"): Set<string> {
  const refs = new Set(
    edges.filter((e) => e.relation === "cites" && e.fromSourceId === id).map((e) => e.toSourceId)
  );
  const citers = new Set(
    edges.filter((e) => e.relation === "cites" && e.toSourceId === id).map((e) => e.fromSourceId)
  );
  if (mode === "refs") return refs;
  if (mode === "citers") return citers;
  const out = new Set<string>([...refs, ...citers]);
  for (const e of edges) {
    if (e.relation !== "related") continue;
    if (e.fromSourceId === id) out.add(e.toSourceId);
    if (e.toSourceId === id) out.add(e.fromSourceId);
  }
  return out;
}

type Graph = {
  nodes: Array<{
    id: string;
    title: string;
    x: number;
    y: number;
    shortLabel?: string;
    color?: string;
    r?: number;
    isFocus?: boolean;
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

const TYPE_LABEL: Record<string, string> = {
  journal: "저널 논문",
  thesis: "학위 논문",
  conference: "학술대회 논문",
  review: "리뷰 논문",
  paper: "저널 논문",
  note: "노트",
  plan: "계획서",
  feedback: "피드백",
  other: "기타"
};

type Props = {
  library: SourceLibrary;
  graph: Graph | null;
  onFocus?: (id: string) => void;
};

export function LineageExplorer({ library, graph, onFocus }: Props) {
  const collections = library.collections ?? [];
  const [activeCols, setActiveCols] = useState<string[]>(() => collections.map((c) => c.id));
  const [yearMin, setYearMin] = useState(2000);
  const [yearMax, setYearMax] = useState(2026);
  const [types, setTypes] = useState<string[]>(["journal", "review", "conference", "thesis"]);
  const [selectedId, setSelectedId] = useState<string | undefined>(graph?.focusId);
  const [highlight, setHighlight] = useState<Set<string> | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(false);

  const selected = library.documents.find((d) => d.id === (selectedId ?? graph?.focusId));

  const visibleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const d of library.documents) {
      const y = d.year ?? 2010;
      if (y < yearMin || y > yearMax) continue;
      const t = d.literatureType ?? (d.kind === "paper" ? "journal" : d.kind === "note" ? "review" : "journal");
      if (!types.includes(t) && !types.includes(d.kind)) continue;
      if (collections.length && d.collectionId && activeCols.length && !activeCols.includes(d.collectionId)) continue;
      ids.add(d.id);
    }
    return ids;
  }, [library.documents, yearMin, yearMax, types, activeCols, collections.length]);

  const nodes = (graph?.nodes ?? []).filter((n) => visibleIds.has(n.id));
  const edges = (graph?.edges ?? []).filter(
    (e) => visibleIds.has(e.fromSourceId) && visibleIds.has(e.toSourceId)
  );

  function toggleCol(id: string) {
    setActiveCols((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function highlightMode(mode: "similar" | "refs" | "citers") {
    if (!selected) return;
    const ids = neighborIds(library.edges, selected.id, mode);
    ids.add(selected.id);
    setHighlight(ids);
  }

  function resetFilters() {
    setActiveCols(collections.map((c) => c.id));
    setYearMin(2000);
    setYearMax(2026);
    setTypes(["journal", "review", "conference", "thesis"]);
    setHighlight(null);
  }

  const width = graph?.width ?? 760;
  const height = graph?.height ?? 460;

  return (
    <div className="lineage-explorer">
      <aside className="lineage-side">
        <h3>내 컬렉션</h3>
        <ul className="lineage-collections">
          {collections.map((c) => {
            const n = library.documents.filter((d) => d.collectionId === c.id).length;
            return (
              <li key={c.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={activeCols.includes(c.id)}
                    onChange={() => toggleCol(c.id)}
                  />
                  <span className="col-dot" style={{ background: c.color }} />
                  <span className="col-name">{c.name}</span>
                  <em>{n}</em>
                </label>
              </li>
            );
          })}
        </ul>
        <h3>필터</h3>
        <div className="field">
          <label>
            연도 {yearMin} – {yearMax}
            <input
              type="range"
              min={2000}
              max={2026}
              value={yearMin}
              onChange={(e) => setYearMin(Number(e.target.value))}
            />
            <input
              type="range"
              min={2000}
              max={2026}
              value={yearMax}
              onChange={(e) => setYearMax(Number(e.target.value))}
            />
          </label>
          <fieldset className="lineage-types">
            <legend>문헌 유형</legend>
            {[
              ["journal", "저널 논문"],
              ["thesis", "학위 논문"],
              ["conference", "학술대회 논문"],
              ["review", "리뷰 논문"]
            ].map(([id, label]) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={types.includes(id)}
                  onChange={() =>
                    setTypes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <button className="outline-btn" type="button" onClick={resetFilters}>
            <RotateCcw size={14} /> 필터 초기화
          </button>
        </div>
      </aside>

      <div className="lineage-canvas">
        <div className="lineage-canvas-head">
          <div>
            <h2 style={{ margin: "0 0 4px" }}>논문 계보 시각화</h2>
            <p className="muted" style={{ margin: 0 }}>
              인용 관계를 탐색하고 관련 연구를 확장하세요
            </p>
          </div>
          <div className="lineage-tools">
            <button type="button" className={!pan ? "on" : ""} onClick={() => setPan(false)} aria-label="선택">
              <MousePointer2 size={15} />
            </button>
            <button type="button" className={pan ? "on" : ""} onClick={() => setPan(true)} aria-label="이동">
              <Hand size={15} />
            </button>
            <button type="button" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))} aria-label="확대">
              <Plus size={15} />
            </button>
            <button type="button" onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))} aria-label="축소">
              <Minus size={15} />
            </button>
            <button type="button" onClick={() => setZoom(1)} aria-label="맞춤">
              <Expand size={15} />
            </button>
          </div>
        </div>
        {!nodes.length ? (
          <p className="muted" style={{ padding: 24 }}>
            자료를 추가하거나 데모 논문 시드를 누르면 계보가 그려집니다.
          </p>
        ) : (
          <svg
            className="lineage-svg"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="논문 계보 그래프"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center", cursor: pan ? "grab" : "pointer" }}
          >
            <defs>
              <marker id="lin-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L7,3 L0,6 Z" fill="#8aa0bf" />
              </marker>
            </defs>
            {edges.map((e) => {
              const from = nodes.find((n) => n.id === e.fromSourceId);
              const to = nodes.find((n) => n.id === e.toSourceId);
              if (!from || !to) return null;
              const dim = highlight && !highlight.has(from.id) && !highlight.has(to.id);
              const related = e.relation === "related";
              return (
                <line
                  key={e.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={related ? "#c5b4ff" : "#8aa0bf"}
                  strokeWidth={from.isFocus || to.isFocus ? 2.4 : 1.6}
                  strokeDasharray={related ? "5 4" : undefined}
                  markerEnd="url(#lin-arrow)"
                  opacity={dim ? 0.15 : 0.9}
                />
              );
            })}
            {nodes.map((n) => {
              const dim = highlight && !highlight.has(n.id);
              const isSel = n.id === selected?.id;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  opacity={dim ? 0.22 : 1}
                  onClick={() => {
                    setSelectedId(n.id);
                    setHighlight(null);
                    onFocus?.(n.id);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {isSel ? <circle r={(n.r ?? 28) + 8} fill={n.color ?? "#316BFF"} opacity="0.16" /> : null}
                  <circle r={n.r ?? 28} fill={n.color ?? "#316BFF"} stroke="#fff" strokeWidth={isSel ? 3 : 2} />
                  <text textAnchor="middle" y={4} fontSize={n.isFocus ? 12 : 10} fill="#fff" fontWeight={700}>
                    {n.shortLabel ?? n.title.slice(0, 10)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <aside className="lineage-detail">
        {selected ? <PaperDetail doc={selected} onMode={highlightMode} /> : <p className="muted">노드를 선택하세요.</p>}
      </aside>
    </div>
  );
}

function PaperDetail({
  doc,
  onMode
}: {
  doc: SourceDocument;
  onMode: (mode: "similar" | "refs" | "citers") => void;
}) {
  const type = TYPE_LABEL[doc.literatureType ?? doc.kind] ?? "문헌";
  return (
    <>
      <span className="pill blue">{type}</span>
      <h3>{doc.title}</h3>
      <p className="muted">
        {doc.authors}
        {doc.year ? ` · ${doc.year}` : ""}
        {doc.venue ? ` · ${doc.venue}` : ""}
      </p>
      <div className="lineage-actions">
        <button type="button" className="outline-btn" onClick={() => onMode("similar")}>
          유사 논문
        </button>
        <button type="button" className="outline-btn" onClick={() => onMode("refs")}>
          참고문헌
        </button>
        <button type="button" className="outline-btn" onClick={() => onMode("citers")}>
          피인용
        </button>
      </div>
      <h4>초록 요약</h4>
      <p style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{doc.text.slice(0, 420)}</p>
      {doc.keywords?.length ? (
        <>
          <h4>주요 키워드</h4>
          <div className="keyword-row">
            {doc.keywords.map((k) => (
              <span key={k} className="pill gray">
                {k}
              </span>
            ))}
          </div>
        </>
      ) : null}
      {doc.doi ? (
        <a className="primary-btn" href={`https://doi.org/${doc.doi}`} target="_blank" rel="noreferrer">
          원문 보기
        </a>
      ) : (
        <p className="muted" style={{ fontSize: 12 }}>
          데모 코퍼스 · 원문 DOI 없음
        </p>
      )}
    </>
  );
}
