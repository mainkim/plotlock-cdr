"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";

type PlanId = "trial" | "solo" | "lab";

type PlanState = {
  planId: PlanId;
  billing: "monthly" | "yearly";
  startedAt: string;
  trialEndsAt?: string;
};

const STORAGE_KEY = "haebom_plan_mock";

const PLANS: Array<{
  id: PlanId;
  name: string;
  badge?: string;
  priceMonthly: string;
  priceYearly: string;
  priceNote: string;
  cta: string;
  features: string[];
  highlight?: boolean;
}> = [
  {
    id: "trial",
    name: "14일 체험",
    badge: "체험",
    priceMonthly: "₩0",
    priceYearly: "₩0",
    priceNote: "유료 구독 전 체험 · 카드 없이 시작",
    cta: "체험 시작",
    features: [
      "연구 설계 · AI 초안",
      "참가자 데모 런타임",
      "제한된 event logging",
      "CSV export (제한)",
      "Publish는 watermark DEMO"
    ]
  },
  {
    id: "solo",
    name: "개인 구독",
    badge: "월간/연간",
    priceMonthly: "₩49,000",
    priceYearly: "₩490,000",
    priceNote: "연구자 1인 구독 · 표시 가격은 예시입니다",
    cta: "구독하기",
    features: [
      "실제 연구 Publish",
      "참가자 세션 · 행동 로그",
      "CSV / Codebook / XLSX",
      "Study versioning",
      "OpenAlex 문헌 · 계보"
    ],
    highlight: true
  },
  {
    id: "lab",
    name: "연구실 구독",
    badge: "팀",
    priceMonthly: "₩290,000",
    priceYearly: "₩2,900,000",
    priceNote: "연구실 단위 구독 · 표시 가격은 예시입니다",
    cta: "연구실 구독",
    features: [
      "개인 구독 기능 전부",
      "연구실 공동작업",
      "템플릿 재사용",
      "PI review / 권한",
      "복수 연구 동시 운영"
    ]
  }
];

function loadPlan(): PlanState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlanState & { planId: string };
    if (parsed.planId === "per_study") parsed.planId = "solo";
    if (parsed.planId !== "trial" && parsed.planId !== "solo" && parsed.planId !== "lab") return null;
    return parsed as PlanState;
  } catch {
    return null;
  }
}

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [current, setCurrent] = useState<PlanState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(loadPlan());
  }, []);

  function selectPlan(planId: PlanId) {
    const now = new Date();
    const next: PlanState = {
      planId,
      billing,
      startedAt: now.toISOString(),
      trialEndsAt:
        planId === "trial"
          ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
          : undefined
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setCurrent(next);
    const label = PLANS.find((p) => p.id === planId)?.name ?? planId;
    setNotice(
      planId === "trial"
        ? `14일 체험이 시작되었습니다. (목업 · 결제 없음) 홈에서 연구를 만들어 보세요.`
        : `${label}이 선택되었습니다. (목업 · 실제 결제는 아직 연결되지 않았습니다)`
    );
  }

  function clearPlan() {
    localStorage.removeItem(STORAGE_KEY);
    setCurrent(null);
    setNotice("플랜 선택이 초기화되었습니다.");
  }

  return (
    <AppShell>
      <div className="workspace-head">
        <div>
          <span className="pill mint">수익모델</span>
          <h1>해봄은 유료 구독으로 운영합니다</h1>
          <p>
            개인 구독과 연구실 구독. 표시 금액은 예시이며, 현재 매출이 발생한 것처럼 말하지 않습니다.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            style={{
              display: "inline-flex",
              border: "1px solid var(--line)",
              borderRadius: 999,
              padding: 4,
              background: "#fff"
            }}
          >
            <button
              type="button"
              className={billing === "monthly" ? "primary-btn" : "outline-btn"}
              style={{ height: 36, boxShadow: "none" }}
              onClick={() => setBilling("monthly")}
            >
              월간
            </button>
            <button
              type="button"
              className={billing === "yearly" ? "primary-btn" : "outline-btn"}
              style={{ height: 36, boxShadow: "none" }}
              onClick={() => setBilling("yearly")}
            >
              연간 · 2개월 할인
            </button>
          </div>
        </div>
      </div>

      <div className="alert alert-ok">
        수익모델: 유료 구독 (개인 / 연구실). 14일 체험은 구독 전환용이며, 연구 건당 과금이 아닙니다.
      </div>

      {current ? (
        <div className="alert alert-ok" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span>
            현재 선택: <strong>{PLANS.find((p) => p.id === current.planId)?.name}</strong>
            {current.planId === "trial" && current.trialEndsAt
              ? ` · 체험 종료 예정 ${new Date(current.trialEndsAt).toLocaleDateString("ko-KR")}`
              : ""}
            {current.planId === "lab" || current.planId === "solo"
              ? ` · ${current.billing === "yearly" ? "연간" : "월간"} 구독`
              : ""}
            {" · "}
            <span className="demo-badge">MOCK</span>
          </span>
          <button type="button" className="outline-btn" style={{ height: 34 }} onClick={clearPlan}>
            플랜 초기화
          </button>
        </div>
      ) : null}

      {notice ? <div className="alert alert-ok">{notice}</div> : null}

      <div className="pricing-grid">
        {PLANS.map((plan) => {
          const active = current?.planId === plan.id;
          const price =
            billing === "yearly" && (plan.id === "lab" || plan.id === "solo")
              ? plan.priceYearly
              : plan.priceMonthly;
          const period =
            plan.id === "trial"
              ? "/ 14일"
              : billing === "yearly"
                ? "/ 년"
                : "/ 월";
          return (
            <div
              key={plan.id}
              className="panel"
              style={{
                margin: 0,
                borderColor: plan.highlight ? "rgba(49,107,255,0.45)" : undefined,
                boxShadow: plan.highlight ? "0 14px 40px rgba(49,107,255,0.12)" : undefined,
                position: "relative"
              }}
            >
              {plan.badge ? (
                <span className={`pill ${plan.id === "trial" ? "mint" : plan.highlight ? "blue" : "gray"}`}>
                  {plan.badge}
                </span>
              ) : null}
              <h3 style={{ marginTop: 12, marginBottom: 4 }}>{plan.name}</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "12px 0 4px" }}>
                <strong style={{ fontSize: 32, letterSpacing: "-0.03em" }}>{price}</strong>
                <span className="muted">{period}</span>
              </div>
              <p className="muted" style={{ fontSize: 13, minHeight: 40 }}>
                {plan.priceNote}
              </p>
              <ul style={{ paddingLeft: 0, listStyle: "none", margin: "16px 0 20px" }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Check size={16} color="var(--mint)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={active ? "outline-btn" : "primary-btn"}
                style={{ width: "100%" }}
                onClick={() => selectPlan(plan.id)}
                disabled={active}
              >
                {active ? "선택됨" : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      <div className="composer-card" style={{ marginTop: 22 }}>
        <div className="ai-orb">
          <Sparkles size={21} />
        </div>
        <div className="composer-copy">
          <strong>구독하고 연구 초안을 바로 만들어 보세요</strong>
          <span>이 화면의 결제는 목업입니다. 플랜 선택은 이 브라우저에만 저장됩니다.</span>
        </div>
        <div className="upload-row">
          <button type="button" className="primary" onClick={() => selectPlan("solo")}>
            개인 구독 선택
          </button>
          <Link className="outline-btn" href="/studies/new" style={{ height: 38 }}>
            AI 연구 만들기
          </Link>
          <Link className="outline-btn" href="/demo" style={{ height: 38 }}>
            데모 시드
          </Link>
        </div>
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>포함 / 분리 항목</h3>
        <div className="grid-2">
          <div>
            <h4 style={{ marginTop: 0 }}>구독에 포함</h4>
            <ul>
              <li>연구 설계 · QA · versioning</li>
              <li>참가자 런타임 · event logging</li>
              <li>dashboard · export · 문헌 계보</li>
            </ul>
          </div>
          <div>
            <h4 style={{ marginTop: 0 }}>구독과 별도</h4>
            <ul>
              <li>참가자 보상비 / 리워드</li>
              <li>외부 모집 채널 비용 (Prolific 등)</li>
              <li>IRB / 기관 심의 비용</li>
            </ul>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
