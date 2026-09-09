"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, WandSparkles } from "lucide-react";
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
      <div className="workspace-head">
        <div>
          <span className="pill blue">AI 초안</span>
          <h1>AI에게 연구 설명하기</h1>
          <p>
            AI는 OpenAlex에서 관련 논문을 찾고, 그 코퍼스로만 자극 초안을 만듭니다. 표본수·IRB·척도 출처는
            확정하지 않고 reviewRequired로 남깁니다.
          </p>
        </div>
      </div>

      <div className="composer-card">
        <div className="ai-orb">
          <Sparkles size={21} />
        </div>
        <div className="composer-copy">
          <strong>자연어로 연구 목적을 설명해 주세요.</strong>
          <span>입력과 동시에 OpenAlex·RAG 도구를 호출합니다. 2×2 데모 시나리오가 미리 채워져 있습니다.</span>
        </div>
        <textarea aria-label="연구 설명" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <div className="upload-row">
          <button type="button" onClick={() => setPrompt(DEMO_PROMPT)}>
            데모 프롬프트 채우기
          </button>
          <button className="primary" type="button" onClick={generate} disabled={busy || !prompt.trim()}>
            <WandSparkles size={17} />
            {busy ? "문헌 검색·초안 생성 중…" : "구조화된 실험 초안 생성"}
          </button>
        </div>
      </div>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <div className="notice">연구자가 승인하기 전에는 게시되지 않습니다.</div>
    </AppShell>
  );
}
