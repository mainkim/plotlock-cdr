"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/client-api";

const DEMO_PROMPT = `추천 이유를 설명하는지와 말투가 온화한지가 추천 신뢰에 미치는 영향을 비교하고 싶어요.
2x2 between-subject 실험으로 만들고,
추천 기준 더 보기 버튼 클릭도 행동으로 기록해주세요.`;

export default function NewStudyPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState(DEMO_PROMPT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ study: { id: string } }>("create_from_prompt", { prompt, isDemo: false });
      router.push(`/studies/${result.study.id}?tab=design`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <section className="panel">
        <h2>AI에게 연구 설명하기</h2>
        <p className="muted">
          AI는 구조화된 실험 초안만 생성합니다. 표본수·IRB·척도 출처·통계 검정은 확정하지 않고 reviewRequired로
          남깁니다.
        </p>
        <div className="field" style={{ marginTop: "1rem" }}>
          <label htmlFor="prompt">연구 아이디어 (자연어)</label>
          <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </div>
        {error ? <div className="alert alert-danger">{error}</div> : null}
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button className="btn" onClick={generate} disabled={busy || !prompt.trim()}>
            {busy ? "초안 생성 중…" : "구조화된 실험 초안 생성"}
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => setPrompt(DEMO_PROMPT)}>
            데모 프롬프트 채우기
          </button>
        </div>
      </section>
    </AppShell>
  );
}
