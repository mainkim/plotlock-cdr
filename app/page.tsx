"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  FileText,
  FlaskConical,
  Sparkles,
  Upload,
  WandSparkles
} from "lucide-react";
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

const DEMO_PROMPT = `추천 이유를 설명하는지와 말투가 온화한지가 추천 신뢰에 미치는 영향을 비교하고 싶어요.
2x2 between-subject 실험으로 만들고,
추천 기준 더 보기 버튼 클릭도 행동으로 기록해주세요.`;

export default function HomePage() {
  const router = useRouter();
  const [studies, setStudies] = useState<StudyRow[]>([]);
  const [prompt, setPrompt] = useState(DEMO_PROMPT);
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
      router.push(`/studies/${result.study.id}?tab=conditions`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy(false);
    }
  }

  async function startAi() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api<{ study: { id: string } }>("create_from_prompt", { prompt });
      router.push(`/studies/${result.study.id}?tab=design`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="page-title">
        <div>
          <span className="pill mint">연구자 워크스페이스</span>
          <h1>어떤 연구를 앱으로 만들까요?</h1>
          <p>연구계획서와 선행연구를 올리면 AI가 실행 가능한 구조를 먼저 제안합니다.</p>
        </div>
        <button className="outline-btn" type="button" onClick={seedDemo} disabled={busy}>
          <BookOpen size={17} />
          {busy ? "데모 준비 중…" : "60초 데모 시드"}
        </button>
      </div>

      {message ? <div className="alert alert-ok">{message}</div> : null}

      <div className="composer-card">
        <div className="ai-orb">
          <Sparkles size={21} />
        </div>
        <div className="composer-copy">
          <strong>연구계획서와 선행연구를 올려주세요.</strong>
          <span>지도교수님의 피드백을 통째로 붙여넣어도 좋습니다. AI는 초안만 만들고 타당성을 보장하지 않습니다.</span>
        </div>
        <textarea
          aria-label="연구 설명"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="upload-row">
          <button type="button">
            <Upload size={17} />
            연구계획서.pdf
          </button>
          <button type="button">
            <Upload size={17} />
            선행연구 추가
          </button>
          <button type="button">
            <FileText size={17} />
            교수님 피드백
          </button>
          <button className="primary" type="button" onClick={startAi} disabled={busy || !prompt.trim()}>
            <WandSparkles size={17} />
            AI 연구 설계 시작
          </button>
        </div>
      </div>

      <div className="section-head">
        <div>
          <h2>최근 연구</h2>
          <p>마지막 작업부터 이어서 진행하세요.</p>
        </div>
        <Link href="/studies/new">
          전체 보기 <ChevronRight size={16} />
        </Link>
      </div>

      {!studies.length ? (
        <div className="panel">
          <p className="muted" style={{ margin: 0 }}>
            아직 연구가 없습니다. AI로 새 연구를 만들거나 60초 데모 시드를 눌러 주세요.
          </p>
        </div>
      ) : (
        <div className="study-grid">
          {studies.map((s) => {
            const liveLabel = s.status === "published" ? "Live" : s.status === "closed" ? "Closed" : "Draft";
            const progress = s.targetN ? Math.min(100, Math.round((s.assignedN / s.targetN) * 100)) : 0;
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
                  설계 {s.designLabel || "—"} · 완료 {s.completedN} / 배정 {s.assignedN}
                  {s.isDemo ? " · DEMO" : ""}
                </p>
                <div
                  style={{
                    height: 5,
                    borderRadius: 8,
                    background: "#edf1f5",
                    margin: "16px 0 10px",
                    overflow: "hidden"
                  }}
                >
                  <div style={{ width: `${progress}%`, height: "100%", background: "var(--blue)" }} />
                </div>
                <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                  업데이트 {new Date(s.updatedAt).toLocaleString("ko-KR")}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
