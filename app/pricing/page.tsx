"use client";

import { AppShell } from "@/components/AppShell";

export default function PricingPage() {
  return (
    <AppShell>
      <div className="workspace-head">
        <div>
          <span className="pill amber">수익모델 가설</span>
          <h1>확정된 가격이 아닙니다</h1>
          <p>현재 매출이 있는 것처럼 표시하지 않습니다. 참가자 보상비는 SaaS 매출과 분리합니다.</p>
        </div>
      </div>
      <div className="alert alert-warn">가설: 무료 Preview → 연구 프로젝트 단위 유료 → 반복 사용 연구실 구독</div>
      <div className="study-grid" style={{ marginTop: "1rem" }}>
        <div className="panel" style={{ margin: 0 }}>
          <h3>Free</h3>
          <ul>
            <li>연구 설계</li>
            <li>Preview</li>
            <li>demo participants</li>
            <li>limited events</li>
          </ul>
        </div>
        <div className="panel" style={{ margin: 0 }}>
          <h3>Per Study</h3>
          <ul>
            <li>실제 연구 publish</li>
            <li>participant sessions</li>
            <li>event logging</li>
            <li>export / codebook / versioning</li>
          </ul>
        </div>
        <div className="panel" style={{ margin: 0 }}>
          <h3>Lab Plan</h3>
          <ul>
            <li>연구실 공동작업</li>
            <li>template reuse</li>
            <li>PI review</li>
            <li>multiple studies / access control</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
