import Link from "next/link";
import { ExternalLink, FlaskConical } from "lucide-react";

export const HAEBOM_LIVE_EXAMPLE = {
  title: "운동 계획 도우미",
  subtitle: "생성형 AI 운동계획 · 개인화 × 어조 실험",
  description:
    "가설을 참가자가 실제로 밟는 연구 앱으로 만든 예시입니다. 기초 설문 → AI 형식 운동계획 자극 → 실행 판단·후속 측정까지 한 흐름으로 연결됩니다.",
  href: "https://exercise-demo-xi.vercel.app/",
  badge: "해봄으로 만든 예시",
  notes: ["참가자 런타임", "설문 + 자극", "연구자 확인 패널"]
} as const;

export function HaebomExampleCard({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className={`example-card ${compact ? "compact" : ""}`}
      href={HAEBOM_LIVE_EXAMPLE.href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="example-card-top">
        <div className="ai-orb">
          <FlaskConical size={18} />
        </div>
        <span className="pill mint">{HAEBOM_LIVE_EXAMPLE.badge}</span>
      </div>
      <h3>{HAEBOM_LIVE_EXAMPLE.title}</h3>
      <p className="muted example-sub">{HAEBOM_LIVE_EXAMPLE.subtitle}</p>
      {!compact ? <p className="example-desc">{HAEBOM_LIVE_EXAMPLE.description}</p> : null}
      <div className="chip-row" style={{ marginTop: 12 }}>
        {HAEBOM_LIVE_EXAMPLE.notes.map((n) => (
          <span key={n} className="chip">
            {n}
          </span>
        ))}
      </div>
      <span className="example-cta">
        참가자 화면 열기 <ExternalLink size={14} />
      </span>
    </a>
  );
}

export function HaebomExampleBanner() {
  return (
    <div className="example-banner">
      <div>
        <span className="pill mint">{HAEBOM_LIVE_EXAMPLE.badge}</span>
        <strong>{HAEBOM_LIVE_EXAMPLE.title}</strong>
        <p>{HAEBOM_LIVE_EXAMPLE.subtitle} — 해봄으로 배포한 실제 연구 앱 예시</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a
          className="primary-btn"
          href={HAEBOM_LIVE_EXAMPLE.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          예시 열기 <ExternalLink size={15} />
        </a>
        <Link className="outline-btn" href="/demo">
          60초 데모
        </Link>
      </div>
    </div>
  );
}
