"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api, listStudiesApi } from "@/lib/client-api";

type StudyRow = {
  id: string;
  title: string;
  status: string;
  designLabel: string;
  completedN: number;
  assignedN: number;
  targetN: number;
  updatedAt: string;
  joinCode: string;
  isDemo?: boolean;
};

export default function HomePage() {
  const [studies, setStudies] = useState<StudyRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const data = await listStudiesApi();
    setStudies(data.studies ?? []);
  }

  useEffect(() => {
    refresh().catch((e) => setMessage(e.message));
  }, []);

  async function seedDemo() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api<{ study: { id: string; joinCode: string } }>("seed_demo");
      setMessage(`데모 연구 준비 완료 · 참여코드 ${result.study.joinCode}`);
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell tagline="가설에서 데이터까지, 코딩 없이.">
      <section className="hero">
        <div className="demo-badge" style={{ marginBottom: "0.75rem" }}>
          2026 Trainthon DEMO
        </div>
        <p style={{ letterSpacing: "0.08em", fontSize: "0.8rem", textTransform: "uppercase" }}>해봄 · HAEBOM</p>
        <h1>가설에서 데이터까지, 코딩 없이.</h1>
        <p>
          사회과학 연구자의 가설을 AI로 실제 온라인 실험으로 만들고, 설문과 행동 데이터를 하나의 Participant ID로
          연결합니다.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-light" href="/studies/new">
            새 연구 만들기
          </Link>
          <button className="btn btn-secondary" onClick={seedDemo} disabled={busy}>
            {busy ? "데모 준비 중…" : "60초 데모 시드"}
          </button>
        </div>
      </section>

      {message ? <div className="alert alert-ok">{message}</div> : null}

      <div className="quick-actions">
        <Link href="/studies/new">
          <strong>AI로 연구 만들기</strong>
          <span className="muted">자연어 → 2x2 초안</span>
        </Link>
        <button onClick={seedDemo} disabled={busy}>
          <strong>데모 연구 복제</strong>
          <span className="muted">추천이유 × 온화성</span>
        </button>
        <Link href={studies[0] ? `/studies/${studies[0].id}/data` : "/studies/new"}>
          <strong>데이터 확인</strong>
          <span className="muted">Participant timeline</span>
        </Link>
        <Link href={studies[0] ? `/p/${studies[0].joinCode}` : "/toss"}>
          <strong>참여 링크 보기</strong>
          <span className="muted">참가자 런타임</span>
        </Link>
      </div>

      <section className="panel">
        <h2>최근 연구</h2>
        <p className="muted">Draft / Live / Closed · 설계 · 모집 진행 · 완료 N</p>
        {!studies.length ? (
          <p className="muted" style={{ marginTop: "1rem" }}>
            아직 연구가 없습니다. AI로 새 연구를 만들거나 데모 시드를 눌러 주세요.
          </p>
        ) : (
          <div className="grid-2" style={{ marginTop: "1rem" }}>
            {studies.map((s) => {
              const liveLabel = s.status === "published" ? "Live" : s.status === "closed" ? "Closed" : "Draft";
              const progress = s.targetN ? Math.min(100, Math.round((s.assignedN / s.targetN) * 100)) : 0;
              return (
                <Link key={s.id} href={`/studies/${s.id}`} className="study-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                    <strong>{s.title}</strong>
                    <span className="status-pill" data-status={liveLabel}>
                      {liveLabel}
                    </span>
                  </div>
                  <p className="muted" style={{ margin: "0.45rem 0" }}>
                    설계 {s.designLabel || "—"} · 완료 {s.completedN} / 배정 {s.assignedN}
                    {s.isDemo ? " · DEMO" : ""}
                  </p>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 99,
                      background: "rgba(20,35,28,0.08)",
                      overflow: "hidden"
                    }}
                  >
                    <div style={{ width: `${progress}%`, height: "100%", background: "var(--brand)" }} />
                  </div>
                  <p className="muted" style={{ margin: "0.55rem 0 0", fontSize: "0.82rem" }}>
                    업데이트 {new Date(s.updatedAt).toLocaleString("ko-KR")}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
