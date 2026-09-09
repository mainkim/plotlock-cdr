"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { HaebomLogo } from "@/components/HaebomLogo";

export default function AboutPage() {
  return (
    <AppShell>
      <section className="hero">
        <HaebomLogo size={48} />
        <h1 style={{ marginTop: "1rem" }}>&lt;해봄&gt;</h1>
        <p>
          사회과학 연구자의 가설을 AI로 실제 온라인 실험으로 만들고,
          <br />
          설문과 행동 데이터를 하나로 연결하는 노코드 연구 플랫폼
        </p>
        <p style={{ marginTop: "1.2rem", color: "rgba(255,247,232,0.9)" }}>김해인 | Founder</p>
      </section>

      <section className="panel">
        <h2>핵심 메시지</h2>
        <ul>
          <li>메인: 사람의 생각과 반응을 연구하는 가장 쉬운 방법</li>
          <li>연구자용: 가설에서 데이터까지, 코딩 없이</li>
          <li>핵심: 가설을 실험으로, 의도한 측정을 데이터로</li>
          <li>참가자용: 해봄 참여하기</li>
        </ul>
        <p className="muted">
          해봄은 Qualtrics/Typeform류 폼 빌더가 아닙니다. 조건별 온라인 행동실험과 설문·행동 로그를 Participant ID로
          연결합니다.
        </p>
        <div style={{ marginTop: "1rem" }}>
          <Link className="btn" href="/studies/new">
            데모 시작
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
