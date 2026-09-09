"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/client-api";

type Overview = {
  overview: {
    totalAssigned: number;
    totalCompleted: number;
    completionRate: number;
    dropoutRate: number;
    avgDuration: number;
  };
  conditionBalance: Array<{
    conditionId: string;
    label: string;
    assigned: number;
    completed: number;
    avgDuration: number;
  }>;
  participants: Array<{ id: string; sessionId: string; createdAt: string }>;
  study: { joinCode: string; title: string };
};

export default function DataPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Overview | null>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [exports, setExports] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Overview>("data_overview", { studyId: params.id })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [params.id]);

  async function openTimeline(participantId: string) {
    const t = await api("timeline", { participantId });
    setTimeline(t);
  }

  async function doExport() {
    const files = await api<Record<string, string>>("export", { studyId: params.id });
    setExports(files);
  }

  function download(name: string, content: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <AppShell>
        <div className="alert alert-danger">{error}</div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="panel">데이터 불러오는 중…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginBottom: 0 }}>{data.study.title}</h2>
            <p className="muted">연구 데이터 · DEMO/MOCK 표시 · Raw data는 삭제하지 않습니다.</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link className="btn btn-secondary" href={`/studies/${params.id}`}>
              설계로
            </Link>
            <button className="btn" onClick={doExport}>
              CSV + Codebook Export
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>A. Overview</h3>
        <div className="grid-4">
          <div>
            <div className="muted">Assigned</div>
            <strong>{data.overview.totalAssigned}</strong>
          </div>
          <div>
            <div className="muted">Completed</div>
            <strong>{data.overview.totalCompleted}</strong>
          </div>
          <div>
            <div className="muted">Completion</div>
            <strong>{Math.round(data.overview.completionRate * 100)}%</strong>
          </div>
          <div>
            <div className="muted">Avg duration</div>
            <strong>{Math.round(data.overview.avgDuration / 1000)}s</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>B. Condition balance</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Condition</th>
              <th>Assigned</th>
              <th>Completed</th>
              <th>Avg duration</th>
            </tr>
          </thead>
          <tbody>
            {data.conditionBalance.map((c) => (
              <tr key={c.conditionId}>
                <td>{c.label}</td>
                <td>{c.assigned}</td>
                <td>{c.completed}</td>
                <td>{Math.round(c.avgDuration / 1000)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>C. Participant timeline</h3>
        <p className="muted">참가자를 선택하면 동일 Participant ID의 click + survey 연결을 확인합니다.</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "0.75rem 0" }}>
          {data.participants.map((p) => (
            <button key={p.id} className="btn btn-secondary" onClick={() => openTimeline(p.id)}>
              {p.id.slice(0, 14)}…
            </button>
          ))}
          {!data.participants.length ? <span className="muted">아직 참가자가 없습니다.</span> : null}
        </div>

        {timeline ? (
          <div>
            <p>
              <strong>Participant</strong> <span className="mono">{timeline.participant.id}</span>
              <br />
              <strong>Assigned condition</strong> {timeline.condition?.label}{" "}
              <span className="muted">(연구자 전용 표시)</span>
              <br />
              <strong>Stimulus shown</strong> {timeline.stimulusShown?.title}
            </p>
            <h4>Event timeline</h4>
            <div className="timeline">
              {timeline.events.map((e: any) => (
                <div key={e.eventId} className="timeline-item">
                  <span className="mono">{e.eventType}</span>
                  <span>
                    {e.objectId ? <span className="mono">{e.objectId}</span> : null} · seq {e.sequenceNo} ·{" "}
                    {e.clientTimestamp}
                  </span>
                </div>
              ))}
              {!timeline.events.length ? <p className="muted">이벤트 없음</p> : null}
            </div>
            <h4>Survey responses</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>measure</th>
                  <th>value</th>
                </tr>
              </thead>
              <tbody>
                {timeline.responses.map((r: any) => (
                  <tr key={r.id}>
                    <td className="mono">{r.measureId}</td>
                    <td>{String(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h4>Quality flags</h4>
            {timeline.qualityFlags.length ? (
              timeline.qualityFlags.map((f: any) => (
                <div key={f.id} className="alert alert-warn">
                  {f.type}: {f.detail} · inclusion={f.inclusionDecision}
                </div>
              ))
            ) : (
              <p className="muted">플래그 없음</p>
            )}
          </div>
        ) : null}
      </section>

      {exports ? (
        <section className="panel">
          <h3>Export</h3>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn" onClick={() => download("participant_wide.csv", exports.participantWide)}>
              participant_wide.csv
            </button>
            <button className="btn" onClick={() => download("event_long.csv", exports.eventLong)}>
              event_long.csv
            </button>
            <button className="btn" onClick={() => download("codebook.csv", exports.codebook)}>
              codebook.csv
            </button>
          </div>
          <pre className="mono" style={{ whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>
            {exports.participantWide.slice(0, 800)}
          </pre>
        </section>
      ) : null}
    </AppShell>
  );
}
