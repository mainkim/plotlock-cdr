"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/client-api";
import type { ConditionDiffWarning, QaReport, Study, StudyVersion } from "@/lib/types";

type Bundle = {
  study: Study;
  versions: StudyVersion[];
  current?: StudyVersion;
  draft?: StudyVersion;
  diffs: ConditionDiffWarning[];
  qa: QaReport;
};

const TABS = [
  { id: "design", label: "연구 설계" },
  { id: "conditions", label: "4조건 비교" },
  { id: "stimuli", label: "자극 편집" },
  { id: "survey", label: "설문" },
  { id: "behavior", label: "행동 측정" },
  { id: "qa", label: "Measurement Map / QA" },
  { id: "publish", label: "승인 · Publish" }
] as const;

function StudyPageInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const tab = search.get("tab") || "design";
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await api<Bundle>("get_bundle", { studyId: params.id });
    setBundle(data);
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setBundle(null);
    load()
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const version = bundle?.draft ?? bundle?.current;
  const spec = version?.spec;

  const setTab = (id: string) => router.push(`/studies/${params.id}?tab=${id}`);

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api(action, { studyId: params.id, ...extra });
      await load();
      if (action === "publish") {
        const joinCode = (result as { joinCode?: string }).joinCode;
        setNotice(`Published · 참여 코드 ${joinCode}`);
      } else {
        setNotice("저장되었습니다.");
      }
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy(false);
    }
  }

  const changedCta = useMemo(() => {
    if (!spec) return new Set<string>();
    const ctas = new Set(spec.stimuli.map((s) => s.ctaLabel));
    if (ctas.size <= 1) return new Set<string>();
    return new Set(spec.stimuli.filter((s) => s.ctaLabel !== spec.stimuli[0].ctaLabel).map((s) => s.id));
  }, [spec]);

  if (!bundle || !spec || !version) {
    return (
      <AppShell studyId={params.id}>
        <div className="panel">
          {error ? (
            <>
              <div className="alert alert-danger">{error}</div>
              <button className="primary-btn" type="button" onClick={() => load().catch((e) => setError(e.message))}>
                다시 불러오기
              </button>
            </>
          ) : (
            "불러오는 중…"
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell studyId={bundle.study.id} joinCode={bundle.study.joinCode}>
      <div className="workspace-head">
        <div>
          <span className={`pill ${version.status === "published" ? "mint" : version.status === "review" || version.status === "approved" ? "amber" : "blue"}`}>
            {version.status === "published" ? "실행 중" : version.status === "approved" ? "승인됨" : version.status === "review" ? "검토 중" : "AI 초안"}
          </span>
          <h1>{bundle.study.title}</h1>
          <p>
            Study · v{version.versionNumber}
            {bundle.study.isDemo ? " · DEMO" : ""} · 의도한 조작과 측정이 데이터까지 이어졌는지 확인하세요.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link className="outline-btn" href={`/studies/${bundle.study.id}/data`}>
              데이터
            </Link>
            <Link className="primary-btn" href={`/p/${bundle.study.joinCode}`}>
              참여 링크
            </Link>
        </div>
      </div>

      <section className="panel">
        <p className="muted" style={{ margin: 0 }}>
          화면 흐름 · 설계 → 조건 → 자극 → 설문 → 행동 → QA → 승인
        </p>
        <div className="steps">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`step-chip ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
        {notice ? <div className="alert alert-ok">{notice}</div> : null}
        {error ? <div className="alert alert-danger">{error}</div> : null}
      </section>

      {tab === "design" && (
        <section className="panel">
          <h3>연구 설계 확인</h3>
          <p>
            <strong>RQ</strong> {spec.researchQuestion}
          </p>
          <ul>
            {spec.hypotheses.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <p className="muted">
            설계: {spec.design.type} · factors{" "}
            {spec.design.factors.map((f) => `${f.name}(${f.levels.map((l) => l.label).join("/")})`).join(" × ")}
          </p>
          <div className="alert alert-warn">
            AI 메모: {spec.aiMeta?.note || "초안입니다. 타당성을 보장하지 않습니다."}
          </div>
          <h3>reviewRequired</h3>
          <ul>
            {spec.reviewRequired.map((r) => (
              <li key={r.field}>
                <strong>{r.field}</strong> — {r.reason} → {r.suggestedAction}
              </li>
            ))}
          </ul>
          <button className="primary-btn" type="button" onClick={() => setTab("conditions")}>
            조건 설계로 이동 →
          </button>
        </section>
      )}

      {tab === "conditions" && (
        <section className="panel">
          <h3>조건 비교 (2×2)</h3>
          <p className="muted">조건 간 다른 부분을 강조합니다. 교란변수라고 확정하지 않습니다.</p>
          {bundle.diffs.map((d) => (
            <div key={d.field} className="alert alert-warn">
              {d.message}
            </div>
          ))}
          <div className="condition-grid" style={{ marginTop: "1rem" }}>
            {spec.conditions.map((c) => {
              const stim = spec.stimuli.find((s) => s.conditionId === c.id)!;
              const warn = changedCta.has(stim.id);
              return (
                <div key={c.id} className={`condition-card ${warn ? "warn" : ""}`}>
                  <strong>{c.label}</strong>
                  <p className="muted" style={{ margin: "0.35rem 0" }}>
                    {Object.entries(c.factorLevels)
                      .map(([fid, lid]) => {
                        const f = spec.design.factors.find((x) => x.id === fid);
                        const l = f?.levels.find((x) => x.id === lid);
                        return l?.label;
                      })
                      .join(" · ")}
                  </p>
                  <div className="stimulus-stage" style={{ padding: "0.85rem" }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>{stim.title}</div>
                    <p>{stim.body}</p>
                    {stim.reasonShown ? <p className="highlight">{stim.reasonText}</p> : null}
                    <p>
                      CTA:{" "}
                      <span className={warn ? "highlight" : ""}>{stim.ctaLabel}</span>
                    </p>
                    <p className="muted">{stim.criteriaButtonLabel}</p>
                  </div>
                  {warn ? <span className="diff-chip">의도하지 않은 차이일 수 있습니다. 검토하세요.</span> : null}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button className="outline-btn" type="button" onClick={() => setTab("stimuli")}>
              자극 편집
            </button>
            <button className="primary-btn" type="button" onClick={() => setTab("qa")}>
              측정 설계로 이동 →
            </button>
          </div>
        </section>
      )}

      {tab === "stimuli" && (
        <section className="panel">
          <h3>자극 편집</h3>
          {spec.stimuli.map((stim) => (
            <div key={stim.id} className="field">
              <label>
                {stim.conditionId} · CTA
                <input
                  defaultValue={stim.ctaLabel}
                  onBlur={(e) =>
                    run("update_stimulus", { stimulusId: stim.id, patch: { ctaLabel: e.target.value } })
                  }
                />
              </label>
              <label>
                본문
                <textarea
                  defaultValue={stim.body}
                  onBlur={(e) => run("update_stimulus", { stimulusId: stim.id, patch: { body: e.target.value } })}
                />
              </label>
            </div>
          ))}
          <button className="btn" disabled={busy} onClick={() => run("apply_demo_fixes")}>
            CTA 통일 + 누락 행동측정 추가
          </button>
        </section>
      )}

      {tab === "survey" && (
        <section className="panel">
          <h3>설문 문항</h3>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>구성개념</th>
                <th>문항</th>
                <th>단계</th>
              </tr>
            </thead>
            <tbody>
              {spec.measures.map((m) => (
                <tr key={m.id}>
                  <td className="mono">{m.id}</td>
                  <td>{m.construct}</td>
                  <td>
                    <input
                      defaultValue={m.questionText}
                      style={{ width: "100%" }}
                      onBlur={(e) =>
                        run("update_measure", { measureId: m.id, patch: { questionText: e.target.value } })
                      }
                    />
                  </td>
                  <td>{m.stage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "behavior" && (
        <section className="panel">
          <h3>행동 측정</h3>
          <table className="table">
            <thead>
              <tr>
                <th>이름</th>
                <th>event</th>
                <th>object_id</th>
                <th>필수</th>
              </tr>
            </thead>
            <tbody>
              {spec.behaviorEvents.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td className="mono">{b.eventType}</td>
                  <td className="mono">{b.objectId}</td>
                  <td>{b.required ? "Y" : "N"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "qa" && (
        <section className="panel">
          <h3>Measurement Map</h3>
          <table className="table">
            <thead>
              <tr>
                <th>측정하려는 것</th>
                <th>실제 측정 방식</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {bundle.qa.measurementMap.map((row) => (
                <tr key={row.construct}>
                  <td>{row.construct}</td>
                  <td className="mono">{row.measurementMethod}</td>
                  <td>
                    <span
                      className={`badge ${
                        row.status === "linked" ? "badge-ok" : row.status === "missing" ? "badge-danger" : "badge-warn"
                      }`}
                    >
                      {row.status === "linked" ? "연결됨" : row.status === "missing" ? "누락" : "검토 필요"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ marginTop: "1.2rem" }}>QA · rule-based</h3>
          {bundle.qa.blockers.map((b) => (
            <div key={b.id} className="alert alert-danger">
              [blocker] {b.code}: {b.message}
            </div>
          ))}
          {bundle.qa.warnings.map((b) => (
            <div key={b.id} className="alert alert-warn">
              [warning] {b.code}: {b.message}
            </div>
          ))}

          <h3 style={{ marginTop: "1.2rem" }}>AI review suggestion</h3>
          {bundle.qa.aiSuggestions.map((b) => (
            <div key={b.id} className="alert alert-warn">
              {b.message}
            </div>
          ))}

          <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <button id="qa-fix-btn" className="btn" type="button" disabled={busy} onClick={() => run("apply_demo_fixes")}>
              누락 측정 수정
            </button>
            <button id="qa-goto-publish" className="btn btn-secondary" type="button" disabled={busy} onClick={() => setTab("publish")}>
              승인 단계로
            </button>
          </div>
        </section>
      )}

      {tab === "publish" && (
        <section className="panel">
          <h3>검토·승인 · Version lock</h3>
          <p className="muted">
            Draft → Review → Approved → Published. Published 이후 직접 수정 금지. 수정 시 새 draft version.
          </p>
          <div className="grid-2" style={{ marginBottom: "1rem" }}>
            <div>
              <h4 style={{ marginTop: 0 }}>승인 체크리스트</h4>
              <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
                <li>선행연구/척도 출처는 연구자 확인 (AI 미확정)</li>
                <li>조건별 의도치 않은 차이 검토</li>
                <li className={!bundle.qa.canApprove ? "" : "muted"}>
                  Measurement Map blocker {bundle.qa.canApprove ? "해소됨" : "남음"}
                </li>
                <li className="muted">표본수·IRB는 reviewRequired (연구자 책임)</li>
                <li>개인정보와 연구데이터 분리 (Participant ID)</li>
              </ul>
            </div>
            <div className="approval-card" style={{ background: "var(--navy)", color: "#fff", borderRadius: 20, padding: 24 }}>
              <span className={`pill ${bundle.qa.canApprove ? "mint" : "amber"}`}>
                {bundle.qa.canApprove ? "승인 가능" : "승인 대기"}
              </span>
              <h3 style={{ color: "#fff", margin: "12px 0" }}>
                연구자가 승인한 설계만 실행됩니다
              </h3>
              <p style={{ color: "#c2cfdb", fontSize: 13 }}>
                현재 버전 v{version.versionNumber} · {version.status}. AI는 타당성을 보장하지 않습니다.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button id="btn-submit-review" className="btn btn-secondary" type="button" disabled={busy} onClick={() => run("submit_review")}>
              Review로 제출
            </button>
            <button id="btn-approve" className="btn btn-secondary" type="button" disabled={busy} onClick={() => run("approve")}>
              승인
            </button>
            <button id="btn-publish" className="btn" type="button" disabled={busy} onClick={() => run("publish")}>
              Publish
            </button>
            <button
              className="outline-btn"
              type="button"
              disabled={busy}
              onClick={async () => {
                const result = await run("duplicate");
                const id = (result as { study?: { id: string } })?.study?.id;
                if (id) router.push(`/studies/${id}?tab=design`);
              }}
            >
              연구 복제
            </button>
            {bundle.current?.status === "published" || bundle.study.status === "published" ? (
              <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => run("new_draft")}>
                새 draft version 생성
              </button>
            ) : null}
          </div>
          {(bundle.study.status === "published" || version.status === "published") && (
            <div className="panel" style={{ marginTop: "1rem", marginBottom: 0 }}>
              <h3>모집·실행</h3>
              <p className="muted">웹 링크와 토스 채널에서 동일한 study version이 실행됩니다.</p>
              <div className="url-box" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <code className="mono" style={{ fontSize: 18, fontWeight: 800 }}>
                  {bundle.study.joinCode}
                </code>
                <button
                  className="primary-btn"
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/p/${bundle.study.joinCode}`;
                    navigator.clipboard.writeText(url).catch(() => undefined);
                    setNotice(`참여 링크 복사됨: ${url}`);
                  }}
                >
                  링크 복사
                </button>
                <Link className="outline-btn" href={`/p/${bundle.study.joinCode}`}>
                  참가자 미리보기
                </Link>
                <Link className="outline-btn" href={`/toss?code=${bundle.study.joinCode}`}>
                  토스 참여 채널
                </Link>
                <Link className="outline-btn" href={`/studies/${bundle.study.id}/data`}>
                  데이터 · Export
                </Link>
              </div>
              <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
                참여 경로: /p/{bundle.study.joinCode} · 배정은 서버 equal randomization · condition 비노출
              </p>
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}

export default function StudyPage() {
  return (
    <Suspense>
      <StudyPageInner />
    </Suspense>
  );
}
