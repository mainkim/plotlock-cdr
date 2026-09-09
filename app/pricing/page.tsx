"use client";

import { AppShell } from "@/components/AppShell";

export default function PricingPage() {
  return (
    <AppShell>
      <section className="panel">
        <h2>수익모델 가설</h2>
        <p className="muted">확정된 가격이 아닙니다. 현재 매출이 있는 것처럼 표시하지 않습니다.</p>
        <div className="alert alert-warn">
          가설: 무료 Preview → 연구 프로젝트 단위 유료 → 반복 사용 연구실 구독
        </div>
        <div className="grid-2" style={{ marginTop: "1rem" }}>
          <div className="condition-card">
            <h3>Free</h3>
            <ul>
              <li>연구 설계</li>
              <li>Preview</li>
              <li>demo participants</li>
              <li>limited events</li>
            </ul>
          </div>
          <div className="condition-card">
            <h3>Per Study</h3>
            <ul>
              <li>실제 연구 publish</li>
              <li>participant sessions</li>
              <li>event logging</li>
              <li>export / codebook / versioning</li>
            </ul>
          </div>
          <div className="condition-card">
            <h3>Lab Plan</h3>
            <ul>
              <li>연구실 공동작업</li>
              <li>template reuse</li>
              <li>PI review</li>
              <li>multiple studies / access control</li>
            </ul>
          </div>
          <div className="condition-card">
            <h3>분리 항목</h3>
            <p>참가자 보상비는 SaaS 매출과 분리합니다.</p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
