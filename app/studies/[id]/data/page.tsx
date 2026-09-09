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
  study: { joinCode: string; title: string; id?: string };
};

export default function DataPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Overview | null>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [exports, setExports] = useState<Record<string, string> | null>(null);
  const [xlsx, setXlsx] = useState<{ filename: string; base64: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function refresh() {
    const overview = await api<Overview>("data_overview", { studyId: params.id });
    setData(overview);
    if (overview.participants.length && !selectedId) {
      const first = overview.participants[0].id;
      setSelectedId(first);
      const t = await api("timeline", { participantId: first });
      setTimeline(t);
    }
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function openTimeline(participantId: string) {
    setSelectedId(participantId);
    const t = await api("timeline", { participantId });
    setTimeline(t);
  }

  async function doExport() {
    const files = await api<Record<string, string>>("export", { studyId: params.id });
    setExports(files);
    try {
      const sheet = await api<{ filename: string; base64: string }>("export_xlsx", { studyId: params.id });
      setXlsx(sheet);
    } catch {
      setXlsx(null);
    }
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

  function downloadXlsx() {
    if (!xlsx) return;
    const bin = atob(xlsx.base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = xlsx.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <AppShell studyId={params.id}>
        <div className="alert alert-danger">{error}</div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell studyId={params.id}>
        <div className="panel">데이터 불러오는 중…</div>
      </AppShell>
    );
  }

  const clickEvents =
    timeline?.events?.filter(
      (e: any) => e.eventType === "object_click" || e.objectId === "criteria_button" || e.objectId === "recommendation_select"
    ) ?? [];
  const linked = clickEvents.length > 0 && (timeline?.responses?.length ?? 0) > 0;

  return (
    <AppShell studyId={params.id} joinCode={data.study.joinCode}>
      <div className="workspace-head">
        <div>
          <span className="pill mint">Research Dashboard</span>
          <h1>{data.study.title}</h1>
          <p>조건별 모집 현황 · Participant Timeline · 클릭+설문 연결 · Export · DEMO/MOCK DATA</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link className="outline-btn" href={`/studies/${params.id}?tab=publish`}>
            참여 링크
          </Link>
          <Link className="outline-btn" href={`/p/${data.study.joinCode}`}>
            참가자 실행
          </Link>
          <button className="primary-btn" type="button" onClick={doExport}>
            CSV / Codebook / XLSX Export
          </button>
        </div>
      </div>

      <section className="panel">
        <h3>Overview</h3>
        <div className="grid-4">
          <div>
            <div className="muted">배정</div>
            <strong style={{ fontSize: 28 }}>{data.overview.totalAssigned}</strong>
          </div>
          <div>
            <div className="muted">완료</div>
            <strong style={{ fontSize: 28 }}>{data.overview.totalCompleted}</strong>
          </div>
          <div>
            <div className="muted">완료율</div>
            <strong style={{ fontSize: 28 }}>{Math.round(data.overview.completionRate * 100)}%</strong>
          </div>
          <div>
            <div className="muted">평균 소요</div>
            <strong style={{ fontSize: 28 }}>{Math.round(data.overview.avgDuration / 1000)}s</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>조건별 모집 현황</h3>
        <p className="muted">서버 equal randomization 결과입니다. (연구자 전용)</p>
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
        <h3>Participant Timeline</h3>
        <p className="muted">동일 Participant ID로 클릭 이벤트와 설문 응답이 연결되는지 확인하세요.</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "0.75rem 0" }}>
          {data.participants.map((p) => (
            <button
              key={p.id}
              className={selectedId === p.id ? "primary-btn" : "outline-btn"}
              type="button"
              onClick={() => openTimeline(p.id)}
            >
              {p.id.slice(0, 16)}…
            </button>
          ))}
          {!data.participants.length ? (
            <span className="muted">
              아직 참가자가 없습니다. <Link href={`/p/${data.study.joinCode}`}>참여 링크</Link>로 실행해 보세요.
            </span>
          ) : null}
        </div>

        {timeline ? (
          <div>
            {linked ? (
              <div className="alert alert-ok">
                연결 확인: Participant <span className="mono">{timeline.participant.id}</span> 에 click(
                {clickEvents.length}) + survey({timeline.responses.length}) 가 동일 ID로 연결됨
              </div>
            ) : (
              <div className="alert alert-warn">클릭 또는 설문 중 일부가 아직 없습니다.</div>
            )}
            <p>
              <strong>Participant</strong> <span className="mono">{timeline.participant.id}</span>
              <br />
              <strong>Assigned condition</strong> {timeline.condition?.label}{" "}
              <span className="muted">(연구자 전용 · 참가자 화면에는 비노출)</span>
              <br />
              <strong>Stimulus shown</strong> {timeline.stimulusShown?.title}
            </p>
            <h4>Event timeline (클릭 포함)</h4>
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
              <p className="muted">플래그 없음 · Raw data는 삭제하지 않습니다.</p>
            )}
          </div>
        ) : null}
      </section>

      {exports ? (
        <section className="panel">
          <h3>CSV / Codebook / XLSX Export</h3>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn" type="button" onClick={() => download("participant_wide.csv", exports.participantWide)}>
              participant_wide.csv
            </button>
            <button className="btn" type="button" onClick={() => download("event_long.csv", exports.eventLong)}>
              event_long.csv
            </button>
            <button className="btn" type="button" onClick={() => download("codebook.csv", exports.codebook)}>
              codebook.csv
            </button>
            {xlsx ? (
              <button className="primary-btn" type="button" onClick={downloadXlsx}>
                {xlsx.filename}
              </button>
            ) : null}
          </div>
          <pre className="mono" style={{ whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>
            {exports.participantWide.slice(0, 900)}
          </pre>
        </section>
      ) : null}
    </AppShell>
  );
}
