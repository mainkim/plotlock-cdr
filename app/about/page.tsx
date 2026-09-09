"use client";

import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/AppShell";

export default function AboutPage() {
  return (
    <AppShell>
      <div className="page-title">
        <div>
          <span className="pill mint">해커톤 소개</span>
          <h1>&lt;해봄&gt;</h1>
          <p>
            사회과학 연구자의 가설을 AI로 실제 온라인 실험으로 만들고, 설문과 행동 데이터를 하나로 연결하는 노코드 연구
            플랫폼
          </p>
        </div>
        <Image src="/haebom-symbol.png" alt="해봄" width={64} height={64} unoptimized />
      </div>

      <section className="panel">
        <h2>핵심 메시지</h2>
        <ul>
          <li>메인: 사람의 생각과 반응을 연구하는 가장 쉬운 방법</li>
          <li>연구자용: 가설에서 데이터까지, 코딩 없이</li>
          <li>핵심: 가설을 실험으로, 의도한 측정을 데이터로</li>
          <li>참가자용: 해봄 참여하기</li>
        </ul>
        <p className="muted">김해인 | Founder</p>
        <p className="muted">
          해봄은 Qualtrics/Typeform류 폼 빌더가 아닙니다. 조건별 온라인 행동실험과 설문·행동 로그를 Participant ID로
          연결합니다.
        </p>
        <div className="notice">원페이저 로고 원본을 재가공하지 않고 이미지 자산으로 직접 사용합니다.</div>
        <div style={{ marginTop: "1rem" }}>
          <Link className="btn" href="/studies/new">
            데모 시작
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
