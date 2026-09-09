import { newId } from "../store";
import type { LineageEdge, SourceDocument, SourceLibrary } from "../types";
import { getSourceLibrary } from "./rag";
import type { StudyDraftSpec } from "../types";

export type LineageNodeView = {
  id: string;
  title: string;
  authors?: string;
  year?: number;
  kind: SourceDocument["kind"];
  shortLabel: string;
  collectionId?: string;
  color: string;
  r: number;
  isFocus: boolean;
  x: number;
  y: number;
};

export type LineageGraphView = {
  nodes: LineageNodeView[];
  edges: LineageEdge[];
  focusId?: string;
  width: number;
  height: number;
};

export function authorYearLabel(doc: { authors?: string; year?: number; title: string }): string {
  const first = (doc.authors ?? "").split(/[,&]/)[0].trim();
  const last = first.split(/\s+/).filter(Boolean).slice(-1)[0] ?? "";
  const name = last.length > 12 ? `${last.slice(0, 11)}…` : last;
  if (name && doc.year) return `${name}, ${doc.year}`;
  if (doc.year) return String(doc.year);
  const t = doc.title === "Untitled" ? "Paper" : doc.title;
  return t.slice(0, 14);
}

/** Sync citesSourceIds on documents into explicit lineage edges */
export function syncLineageFromDocuments(library: SourceLibrary): SourceLibrary {
  const existing = new Set(library.edges.map((e) => `${e.fromSourceId}->${e.toSourceId}:${e.relation}`));
  for (const doc of library.documents) {
    for (const target of doc.citesSourceIds ?? []) {
      if (!library.documents.some((d) => d.id === target)) continue;
      const key = `${doc.id}->${target}:cites`;
      if (existing.has(key)) continue;
      library.edges.push({
        id: newId("edge"),
        fromSourceId: doc.id,
        toSourceId: target,
        relation: "cites"
      });
      existing.add(key);
    }
  }
  return library;
}

function collectionColor(library: SourceLibrary, collectionId?: string) {
  return library.collections?.find((c) => c.id === collectionId)?.color ?? "#316BFF";
}

/**
 * ResearchRabbit-inspired layout: focus in the center,
 * references (cited) to the left, citing works to the right.
 */
export function buildLineageGraph(spec: StudyDraftSpec, focusId?: string): LineageGraphView {
  const library = syncLineageFromDocuments({
    ...getSourceLibrary(spec),
    documents: [...getSourceLibrary(spec).documents],
    edges: [...getSourceLibrary(spec).edges]
  });
  const docs = library.documents;
  const width = 760;
  const height = 460;
  if (!docs.length) return { nodes: [], edges: [], width, height };

  const citedCount = new Map<string, number>();
  for (const e of library.edges) {
    if (e.relation === "cites") {
      citedCount.set(e.toSourceId, (citedCount.get(e.toSourceId) ?? 0) + 1);
    }
  }

  const focus =
    docs.find((d) => d.id === focusId) ??
    docs.find((d) => d.authors?.startsWith("Jang")) ??
    [...docs].sort((a, b) => (citedCount.get(b.id) ?? 0) - (citedCount.get(a.id) ?? 0))[0];

  const refs = docs.filter((d) =>
    library.edges.some((e) => e.relation === "cites" && e.fromSourceId === focus.id && e.toSourceId === d.id)
  );
  const citers = docs.filter((d) =>
    library.edges.some((e) => e.relation === "cites" && e.fromSourceId === d.id && e.toSourceId === focus.id)
  );
  const used = new Set([focus.id, ...refs.map((d) => d.id), ...citers.map((d) => d.id)]);
  const others = docs.filter((d) => !used.has(d.id));

  const cx = width / 2;
  const cy = height / 2 + 8;
  const citeN = library.edges.filter((e) => e.relation === "cites").length;

  const placeArc = (list: SourceDocument[], start: number, end: number, radius: number, r = 22) => {
    return list.map((doc, i) => {
      const t = list.length === 1 ? (start + end) / 2 : start + ((end - start) * i) / Math.max(1, list.length - 1);
      return { doc, x: cx + Math.cos(t) * radius, y: cy + Math.sin(t) * radius, r };
    });
  };

  const placed =
    citeN === 0
      ? docs.map((doc, i) => {
          const t = -Math.PI / 2 + (2 * Math.PI * i) / docs.length;
          const radius = docs.length === 1 ? 0 : Math.min(170, 70 + docs.length * 12);
          return { doc, x: cx + Math.cos(t) * radius, y: cy + Math.sin(t) * radius, r: 22, isFocus: i === 0 };
        })
      : [
          { doc: focus, x: cx, y: cy, r: 28, isFocus: true },
          ...placeArc(refs, Math.PI * 0.62, Math.PI * 1.38, 155).map((p) => ({ ...p, isFocus: false })),
          ...placeArc(citers, -Math.PI * 0.38, Math.PI * 0.38, 165).map((p) => ({ ...p, isFocus: false })),
          ...placeArc(others, Math.PI * 0.2, Math.PI * 0.8, 215, 20).map((p) => ({ ...p, isFocus: false }))
        ];

  const nodes: LineageNodeView[] = placed.map((p) => ({
    id: p.doc.id,
    title: p.doc.title,
    authors: p.doc.authors,
    year: p.doc.year,
    kind: p.doc.kind,
    shortLabel: authorYearLabel(p.doc),
    collectionId: p.doc.collectionId,
    color: collectionColor(library, p.doc.collectionId),
    r: p.r,
    isFocus: p.isFocus,
    x: p.x,
    y: p.y
  }));

  return { nodes, edges: library.edges, focusId: focus.id, width, height };
}

export function addLineageEdge(
  library: SourceLibrary,
  fromSourceId: string,
  toSourceId: string,
  relation: LineageEdge["relation"] = "cites",
  note?: string
): SourceLibrary {
  if (fromSourceId === toSourceId) return library;
  const dup = library.edges.some(
    (e) => e.fromSourceId === fromSourceId && e.toSourceId === toSourceId && e.relation === relation
  );
  if (dup) return library;
  library.edges.push({
    id: newId("edge"),
    fromSourceId,
    toSourceId,
    relation,
    note
  });
  return library;
}

export function neighborIds(edges: LineageEdge[], id: string, mode: "refs" | "citers" | "similar"): Set<string> {
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
