"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Play, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/client-api";

const STEPS = [
  { t: "0–8초", d: "한국어로 연구 아이디어 입력" },
  { t: "8–18초", d: "AI가 2×2 연구 초안 생성" },
  { t: "18–28초", d: "4조건 비교 · 누락 행동 측정 warning" },
  { t: "28–35초", d: "수정 + 승인 + Publish" },
  { t: "35–47초", d: "참가자 자극 · 클릭 · 설문" },
  { t: "47–55초", d: "동일 Participant ID 연결 확인" },
  { t: "55–60초", d: "CSV + Codebook export" }
];

export default function DemoPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState<{ studyId: string; joinCode: string } | null>(null);

  async function prepare() {
    setBusy(true);
    setError(null);
    try {
      const seeded = await api<{ study: { id: string; joinCode: string } }>("seed_demo");
      const next = { studyId: seeded.study.id, joinCode: seeded.study.joinCode };
      setReady(next);
      router.push(`/studies/${next.studyId}?tab=conditions`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데모 준비 실패");
    } finally {
      setBusy(false);
    }
  }

  async function startFreshDraft() {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ study: { id: string } }>("create_from_prompt", {
        prompt: `추천 이유를 설명하는지와 말투가 온화한지가 추천 신뢰에 미치는 영향을 비교하고 싶어요.
2x2 between-subject 실험으로 만들고,
추천 기준 더 보기 버튼 클릭도 행동으로 기록해주세요.`
      });
      router.push(`/studies/${result.study.id}?tab=design`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="workspace-head">
        <div>
          <span className="pill mint">Hackathon Demo Mode</span>
          <h1>60초 안에 핵심 가치를 보여주세요</h1>
          <p>가설 → 실험 → 행동+설문 연결 → Export. AI는 타당성을 보장하지 않습니다. DEMO/MOCK DATA.</p>
        </div>
        <button
          id="demo-seed-btn"
          className="primary-btn"
          type="button"
          disabled={busy}
          onClick={() => {
            void prepare();
          }}
        >
          <Play size={17} />
          {busy ? "준비 중…" : "데모 연구 Publish 시드"}
        </button>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>시연 스크립트</h2>
        <div className="timeline">
          {STEPS.map((s) => (
            <div key={s.t} className="timeline-item">
              <strong className="mono">{s.t}</strong>
              <span>{s.d}</span>
            </div>
          ))}
        </div>
      </div>

      {ready ? (
        <div className="panel">
          <span className="pill mint">준비 완료</span>
          <h3>바로 이어서 시연</h3>
          <p className="muted">참여 코드 {ready.joinCode}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="primary-btn" href={`/studies/${ready.studyId}?tab=conditions`}>
              4조건 비교부터 <ChevronRight size={16} />
            </Link>
            <Link className="outline-btn" href={`/p/${ready.joinCode}`}>
              참가자 실행
            </Link>
            <Link className="outline-btn" href={`/studies/${ready.studyId}/data`}>
              데이터 · Export
            </Link>
          </div>
        </div>
      ) : (
        <div className="composer-card">
          <div className="ai-orb">
            <Sparkles size={21} />
          </div>
          <div className="composer-copy">
            <strong>처음부터 라이브로 만들고 싶다면</strong>
            <span>AI 초안 생성부터 시작하면 QA warning까지 보여줄 수 있습니다.</span>
          </div>
          <div className="upload-row">
            <button className="primary" type="button" disabled={busy} onClick={() => void startFreshDraft()}>
              AI 초안부터 시작
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
