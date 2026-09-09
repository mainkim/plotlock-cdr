"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Circle,
  FlaskConical,
  MessageCircle,
  MoreHorizontal,
  Play,
  QrCode,
  ShieldCheck,
  Users
} from "lucide-react";
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
  { id: "design", label: "AI 연구 브리프" },
  { id: "conditions", label: "조건·자극" },
  { id: "stimuli", label: "자극 편집" },
  { id: "survey", label: "설문" },
  { id: "behavior", label: "행동 측정" },
  { id: "qa", label: "측정 설계" },
  { id: "publish", label: "검토·승인" },
  { id: "recruit", label: "모집·실행" }
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
          화면 흐름 · 브리프 → 조건·자극 → 측정 → 검토·승인 → 모집·실행
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
        <section className="panel studio-panel">
          <div className="workspace-head" style={{ marginBottom: 8, padding: 0 }}>
            <div>
              <span className="pill blue">조건·자극 스튜디오</span>
              <h2 style={{ margin: "8px 0 4px" }}>의도한 차이만 남았는지 확인하세요</h2>
              <p className="muted" style={{ margin: 0 }}>
                양적 실험 · {spec.design.factors.map((f) => f.levels.length).join(" × ")} 집단 간 설계
              </p>
            </div>
            <button className="primary-btn" type="button" onClick={() => setTab("qa")}>
              측정 설계로 이동 →
            </button>
          </div>

          {bundle.diffs.map((d) => (
            <div key={d.field} className="alert alert-warn">
              {d.message}
            </div>
          ))}

          <div className="condition-grid studio-grid">
            {spec.conditions.map((c) => {
              const stim = spec.stimuli.find((s) => s.conditionId === c.id)!;
              const warn = changedCta.has(stim.id);
              const levelLabels = Object.entries(c.factorLevels).map(([fid, lid]) => {
                const f = spec.design.factors.find((x) => x.id === fid);
                const l = f?.levels.find((x) => x.id === lid);
                return { factor: f?.name ?? fid, label: l?.label ?? lid };
              });
              return (
                <div key={c.id} className={`condition-card studio-card ${warn ? "warn" : ""}`}>
                  <div className="studio-card-top">
                    <strong>{c.label}</strong>
                    <MoreHorizontal size={16} className="muted" />
                  </div>
                  <div className="factor-pills">
                    {levelLabels.map((lv) => (
                      <span
                        key={lv.factor}
                        className={`pill ${lv.label.includes("없") || lv.label.toLowerCase().includes("no") || lv.label.includes("비제공") ? "gray" : "mint"}`}
                      >
                        {lv.factor}: {lv.label}
                      </span>
                    ))}
                  </div>
                  <div className="stimulus-stage ai-answer-block">
                    <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                      {stim.title || "자극 미리보기"}
                    </div>
                    <p style={{ margin: "0 0 8px" }}>{stim.body}</p>
                    {stim.reasonShown && stim.reasonText ? (
                      <p className="highlight cite-line">{stim.reasonText}</p>
                    ) : (
                      <p className="muted" style={{ fontSize: 12, margin: "0 0 8px" }}>
                        출처/이유 미표시
                      </p>
                    )}
                    <div className={`tone-chip ${stim.tone === "warm" ? "warm" : "neutral"}`}>
                      {stim.tone === "warm" ? "표현: 온화" : "표현: 중립"} · CTA “{stim.ctaLabel}”
                    </div>
                    <p className="muted" style={{ margin: "8px 0 0", fontSize: 12 }}>
                      {stim.criteriaButtonLabel}
                    </p>
                  </div>
                  {warn ? (
                    <span className="diff-chip">의도하지 않은 차이일 수 있습니다. 검토하세요.</span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="studio-footer">
            <div className="studio-check ok">
              <CheckCircle2 size={18} />
              <div>
                <strong>무작위 배정</strong>
                <p>참가자를 {spec.conditions.length}개 조건에 균등 배정합니다.</p>
              </div>
            </div>
            <div className={`studio-check ${bundle.diffs.length || changedCta.size ? "warn" : "ok"}`}>
              {bundle.diffs.length || changedCta.size ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <div>
                <strong>표현·문구 차이</strong>
                <p>
                  {bundle.diffs.length || changedCta.size
                    ? "확신도/CTA 외 표현 차이를 확인하세요."
                    : "조건 간 의도한 조작만 감지되었습니다."}
                </p>
              </div>
            </div>
            <button className="outline-btn" type="button" onClick={() => setTab("stimuli")}>
              차이 상세 보기
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
          <div className="workspace-head" style={{ padding: 0, marginBottom: 12 }}>
            <div>
              <span className="pill amber">게시 전 확인</span>
              <h2 style={{ margin: "8px 0 4px" }}>연구자가 승인한 설계만 실행됩니다</h2>
              <p className="muted" style={{ margin: 0 }}>
                AI 제안, 근거, 윤리 항목을 한 번 더 검토하세요.
              </p>
            </div>
          </div>

          {(() => {
            const checklist = [
              {
                id: "cite",
                done: true,
                label: "선행연구 원문과 인용 일치",
                hint: "연구자 확인 항목 (AI 미확정)"
              },
              {
                id: "scale",
                done: !spec.reviewRequired.some((r) => /scale|척도|번역/i.test(r.field + r.reason)),
                label: "검증 척도와 번역 절차 확인",
                hint: "reviewRequired 척도 항목"
              },
              {
                id: "confound",
                done: !(bundle.diffs.length || changedCta.size),
                label: "조건별 혼입 변인 검토",
                hint: "조건·자극 스튜디오에서 확인"
              },
              {
                id: "n",
                done: !spec.reviewRequired.some((r) => /sample|표본|N\b|target/i.test(r.field + r.reason)),
                label: "표본수 산정 근거 첨부",
                hint: "연구자 책임"
              },
              {
                id: "irb",
                done: !spec.reviewRequired.some((r) => /irb|윤리/i.test(r.field + r.reason)),
                label: "IRB 또는 연구윤리 검토",
                hint: "연구자 책임"
              },
              {
                id: "pii",
                done: true,
                label: "개인정보·민감정보 분리",
                hint: "Participant ID 자동 가명"
              },
              {
                id: "measure",
                done: bundle.qa.canApprove,
                label: "Measurement Map blocker 해소",
                hint: "측정 설계 QA"
              }
            ];
            const doneCount = checklist.filter((c) => c.done).length;
            const pending = checklist.length - doneCount;
            return (
              <div className="approval-layout">
                <div className="checklist-card">
                  <div className="checklist-head">
                    <div className="ai-orb">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <strong>승인 체크리스트</strong>
                      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                        {checklist.length}개 중 {doneCount}개 완료
                      </p>
                    </div>
                  </div>
                  <ul className="checklist">
                    {checklist.map((item) => (
                      <li key={item.id} className={item.done ? "done" : "pending"}>
                        {item.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        <div>
                          <strong>{item.label}</strong>
                          <p>{item.hint}</p>
                        </div>
                        <ChevronRight size={16} className="muted" />
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="approval-card">
                  <FlaskConical size={28} />
                  <span className={`pill ${pending === 0 ? "mint" : "amber"}`}>
                    {pending === 0 ? "승인 가능" : "승인 대기"}
                  </span>
                  <h3>
                    {pending === 0
                      ? "연구앱을 게시할 수 있어요"
                      : `${pending}개 항목을 확인하면 연구앱을 게시할 수 있어요`}
                  </h3>
                  <p>
                    승인 시 현재 설계가 버전 {version.versionNumber}.0으로 고정되고 변경 이력이
                    기록됩니다. AI는 타당성을 보장하지 않습니다.
                  </p>
                  <button
                    className="primary-btn"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (pending > 0) setTab(bundle.qa.canApprove ? "conditions" : "qa");
                      else run("approve");
                    }}
                  >
                    {pending > 0 ? "미완료 항목 확인" : "승인"}
                  </button>
                  <Link className="preview-link" href={`/p/${bundle.study.joinCode}`}>
                    참가자 화면 미리보기 <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })()}

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: 16 }}>
            <button id="btn-submit-review" className="btn btn-secondary" type="button" disabled={busy} onClick={() => run("submit_review")}>
              Review로 제출
            </button>
            <button id="btn-approve" className="btn btn-secondary" type="button" disabled={busy} onClick={() => run("approve")}>
              강제 승인
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
            <button className="primary-btn" type="button" onClick={() => setTab("recruit")}>
              모집·실행으로 →
            </button>
          </div>
        </section>
      )}

      {tab === "recruit" && (
        <section className="panel">
          <div className="workspace-head" style={{ padding: 0, marginBottom: 16 }}>
            <div>
              <span className="pill mint">연구 유형별 모집 설계</span>
              <h2 style={{ margin: "8px 0 4px" }}>연구 방법에 맞게 참가자를 모집하세요</h2>
              <p className="muted" style={{ margin: 0 }}>
                양적 실험의 배정과 질적 연구의 표집을 구분해 설계합니다.
              </p>
            </div>
            <button
              className="primary-btn"
              type="button"
              disabled={busy || !(bundle.study.status === "published" || version.status === "published")}
              onClick={() => {
                if (bundle.study.status === "published" || version.status === "published") {
                  router.push(`/p/${bundle.study.joinCode}`);
                } else {
                  run("publish").then(() => setTab("recruit"));
                }
              }}
            >
              <Play size={16} />
              {bundle.study.status === "published" || version.status === "published"
                ? "선택한 연구 시작"
                : "Publish 후 시작"}
            </button>
          </div>

          <div className="recruit-grid">
            <div className="recruit-card selected">
              <div className="recruit-card-top">
                <FlaskConical size={22} />
                <span className="pill blue">현재 연구</span>
              </div>
              <h3>무작위 배정</h3>
              <p>참가자를 {spec.design.factors.map((f) => f.levels.length).join(" × ")}의{" "}
                {spec.conditions.length}개 조건 중 하나에 무작위로 균등 배정합니다.</p>
              <dl className="recruit-meta">
                <div>
                  <dt>모집 목표</dt>
                  <dd>{bundle.study.targetN || 80}명</dd>
                </div>
                <div>
                  <dt>배정 방식</dt>
                  <dd>층화 없는 단순 무작위 배정</dd>
                </div>
                <div>
                  <dt>수집 데이터</dt>
                  <dd>설문 + 행동 로그</dd>
                </div>
              </dl>
              <div className="chip-row">
                <span className="chip">조건 균형</span>
                <span className="chip">중복 참여 방지</span>
                <span className="chip">Participant ID</span>
              </div>
            </div>

            <div className="recruit-card muted-card">
              <div className="recruit-card-top">
                <MessageCircle size={22} />
                <button className="outline-btn" type="button" style={{ height: 32, padding: "0 12px" }} disabled>
                  설정
                </button>
              </div>
              <h3>목적표집 · 눈덩이표집</h3>
              <p>연구 질문에 적합한 정보제공자를 선정하고, 추천 연결 과정을 기록합니다.</p>
              <dl className="recruit-meta">
                <div>
                  <dt>표집 후보</dt>
                  <dd>목적 · 눈덩이 · 이론적 표집</dd>
                </div>
                <div>
                  <dt>중단 기준</dt>
                  <dd>자료 포화도 연구자 판단</dd>
                </div>
                <div>
                  <dt>수집 데이터</dt>
                  <dd>인터뷰 · 메모 · 전사</dd>
                </div>
              </dl>
              <div className="chip-row">
                <span className="chip mint-chip">추천 경로 기록</span>
                <span className="chip mint-chip">동의 분리</span>
                <span className="chip mint-chip">연구자 승인</span>
              </div>
            </div>
          </div>

          <div className="recruit-footer">
            <div>
              <Users size={18} />
              <div>
                <strong>공통 배포 채널</strong>
                <p>웹 링크 · QR 코드 · 토스 참여 채널</p>
              </div>
            </div>
            <div>
              <ShieldCheck size={18} />
              <div>
                <strong>개인정보 분리</strong>
                <p>가명 Participant ID 자동 생성</p>
              </div>
            </div>
            <Link className="preview-link" href={`/p/${bundle.study.joinCode}`}>
              참가자 화면 미리보기 <ChevronRight size={14} />
            </Link>
          </div>

          {(bundle.study.status === "published" || version.status === "published") && (
            <div className="url-box" style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <QrCode size={18} />
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
              <Link className="outline-btn" href={`/toss?code=${bundle.study.joinCode}`}>
                토스 참여 채널
              </Link>
              <Link className="outline-btn" href={`/studies/${bundle.study.id}/data`}>
                데이터 · Export
              </Link>
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
