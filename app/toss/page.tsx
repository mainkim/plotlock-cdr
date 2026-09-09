"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/AppShell";

function TossInner() {
  const search = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(search.get("code") || "");

  return (
    <AppShell>
      <section className="hero">
        <p style={{ letterSpacing: "0.12em", fontSize: "0.8rem" }}>TOSS MINI APP CHANNEL</p>
        <h1>해봄 참여하기</h1>
        <p>
          Toss는 핵심 제품이 아니라 participant channel입니다. 인증·참여·재진입·리워드·런타임을 담당하며, 연구
          설계/Builder는 포함하지 않습니다.
        </p>
      </section>
      <section className="panel">
        <div className="field">
          <label htmlFor="code">참여 코드</label>
          <input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD1234" />
        </div>
        <button
          className="btn"
          onClick={() => {
            if (code.trim()) router.push(`/p/${code.trim()}?channel=toss_miniapp`);
          }}
        >
          참여 시작
        </button>
        <p className="muted" style={{ marginTop: "1rem" }}>
          배포 채널: web link · Toss Mini App · (future) Prolific · direct recruitment
        </p>
      </section>
    </AppShell>
  );
}

export default function TossPage() {
  return (
    <Suspense>
      <TossInner />
    </Suspense>
  );
}
