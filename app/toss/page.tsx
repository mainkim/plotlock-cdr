"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Play, Users } from "lucide-react";

function TossInner() {
  const search = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(search.get("code") || "");

  return (
    <AppShell>
      <div className="workspace-head">
        <div>
          <span className="pill mint">모집 · 실행</span>
          <h1>해봄 참여하기</h1>
          <p>
            Toss는 핵심 제품이 아니라 participant channel입니다. 웹 링크·QR·토스에서 동일한 연구 버전이 실행됩니다.
          </p>
        </div>
        <button
          className="primary-btn"
          type="button"
          onClick={() => {
            if (code.trim()) router.push(`/p/${code.trim()}?channel=toss_miniapp`);
          }}
        >
          <Play size={17} />
          참여 시작
        </button>
      </div>

      <div className="panel">
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
          <div className="small-icon">
            <Users size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>참여 코드</h2>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              익명 Participant ID가 자동 생성됩니다
            </p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="code">참여 코드</label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD1234"
            style={{ minHeight: 0, height: 44 }}
          />
        </div>
        <div className="channel-row" style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button type="button" className="outline-btn">
            웹 링크
          </button>
          <button type="button" className="outline-btn">
            QR 코드
          </button>
          <button type="button" className="outline-btn">
            토스 참여 채널
          </button>
        </div>
        <p className="muted" style={{ marginTop: "1rem" }}>
          배포 채널: web link · Toss Mini App · (future) Prolific · direct recruitment
        </p>
      </div>
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
