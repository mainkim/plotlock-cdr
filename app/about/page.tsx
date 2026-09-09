import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/AppShell";
import { HaebomExampleCard, HAEBOM_LIVE_EXAMPLE } from "@/components/HaebomExample";

export default function AboutPage() {
  return (
    <AppShell>
      <div className="page-title">
        <div>
          <span className="pill mint">해봄 소개</span>
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
      </section>

      <section className="panel">
        <h2>해봄으로 만든 예시</h2>
        <p className="muted">발표·데모에서 “실제로 나온 참가자 앱”을 보여줄 때 이 링크를 쓰면 됩니다.</p>
        <div className="study-grid">
          <HaebomExampleCard />
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          URL: {HAEBOM_LIVE_EXAMPLE.href}
        </p>
        <div style={{ marginTop: "1rem", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn" href="/studies/new">
            데모 시작
          </Link>
          <Link className="outline-btn" href="/demo">
            60초 플로우
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
