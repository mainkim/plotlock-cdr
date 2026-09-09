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
  x: number;
  y: number;
};

export type LineageGraphView = {
  nodes: LineageNodeView[];
  edges: LineageEdge[];
};

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

/**
 * ResearchRabbit-inspired layout: older / cited works to the left,
 * citing works to the right. Purely presentational for hackathon demo.
 */
export function buildLineageGraph(spec: StudyDraftSpec): LineageGraphView {
  const library = syncLineageFromDocuments({
    ...getSourceLibrary(spec),
    documents: [...getSourceLibrary(spec).documents],
    edges: [...getSourceLibrary(spec).edges]
  });
  const docs = library.documents;
  if (!docs.length) return { nodes: [], edges: [] };

  const citedCount = new Map<string, number>();
  for (const e of library.edges) {
    if (e.relation === "cites") {
      citedCount.set(e.toSourceId, (citedCount.get(e.toSourceId) ?? 0) + 1);
    }
  }

  const sorted = [...docs].sort((a, b) => {
    const ya = a.year ?? 9999;
    const yb = b.year ?? 9999;
    if (ya !== yb) return ya - yb;
    return (citedCount.get(b.id) ?? 0) - (citedCount.get(a.id) ?? 0);
  });

  const columns = Math.max(1, Math.ceil(Math.sqrt(sorted.length)));
  const nodes: LineageNodeView[] = sorted.map((doc, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    return {
      id: doc.id,
      title: doc.title,
      authors: doc.authors,
      year: doc.year,
      kind: doc.kind,
      x: 40 + col * 180,
      y: 36 + row * 110
    };
  });

  return { nodes, edges: library.edges };
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
