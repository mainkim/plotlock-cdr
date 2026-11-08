"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, FlaskConical, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { listStudiesApi } from "@/lib/client-api";

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

export default function StudiesIndexPage() {
  const [studies, setStudies] = useState<StudyRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listStudiesApi()
      .then((data) => {
        if (!cancelled) setStudies(data.studies as StudyRow[]);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <div className="workspace-head">
        <div>
          <span className="pill mint">연구 목록</span>
          <h1>내 연구</h1>
          <p>최근 작업한 연구를 이어서 편집하거나 새로 만드세요.</p>
        </div>
        <Link className="primary-btn" href="/studies/new">
          <Plus size={17} />
          새 연구
        </Link>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {!studies.length && !error ? (
        <div className="panel">
          <p className="muted" style={{ margin: 0 }}>
            아직 연구가 없습니다.{" "}
            <Link href="/studies/new">
              AI로 새 연구 만들기 <ChevronRight size={14} style={{ verticalAlign: "middle" }} />
            </Link>
          </p>
        </div>
      ) : (
        <div className="study-grid">
          {studies.map((s) => {
            const liveLabel = s.status === "published" ? "Live" : s.status === "closed" ? "Closed" : "Draft";
            return (
              <Link key={s.id} href={`/studies/${s.id}`} className="study-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div className="ai-orb">
                    <FlaskConical size={18} />
                  </div>
                  <span className={`pill ${liveLabel === "Live" ? "mint" : "amber"}`}>{liveLabel}</span>
                </div>
                <h3 style={{ margin: "14px 0 6px", fontSize: 15 }}>{s.title}</h3>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  {s.designLabel || "설계 중"} · {s.completedN}/{s.targetN} 완료
                  {s.isDemo ? " · DEMO" : ""}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
