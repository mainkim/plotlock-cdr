import { useEffect, useId, useState, type FormEvent } from "react";
import { researcherApi, type DataOverview, type StudyBundle, type Spec } from "./api";

type Tab = "design" | "listing" | "code" | "responses";

export function StudyScreen({ studyId, onBack }: { studyId: string; onBack: () => void }) {
  const [bundle, setBundle] = useState<StudyBundle | null>(null);
  const [tab, setTab] = useState<Tab>("design");
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const next = await researcherApi<StudyBundle>("get_bundle", { studyId });
    setBundle(next);
  }

  useEffect(() => {
    let cancelled = false;
    researcherApi<StudyBundle>("get_bundle", { studyId })
      .then((next) => {
        if (!cancelled) setBundle(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "연구를 열지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [studyId]);

  async function run(action: string, body: Record<string, unknown> = {}) {
    setError(null);
    try {
      await researcherApi(action, { studyId, ...body });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했습니다.");
    }
  }

  if (!bundle && !error) return <p role="status">불러오는 중…</p>;
  if (!bundle) {
    return (
      <section>
        <button type="button" className="text-btn" onClick={onBack}>
          뒤로
        </button>
        <p className="error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  const spec = bundle.draft?.spec ?? bundle.current?.spec;
  const locked = bundle.draft?.status === "published";

  return (
    <section>
      <button type="button" className="text-btn" onClick={onBack}>
        뒤로
      </button>
      <h1>{bundle.study.title}</h1>
      <p className="muted">상태 {bundle.study.status}</p>
      <div className="tabs" role="tablist">
        {(
          [
            ["design", "설계"],
            ["listing", "공개"],
            ["code", "참여 코드"],
            ["responses", "응답"]
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "tab on" : "tab"} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {tab === "design" && spec ? (
        <Design spec={spec} locked={locked} onSave={(patch) => run("update_draft_meta", patch)} onMeasure={(measureId, questionText) => run("update_measure", { measureId, patch: { questionText } })} onStimulus={(stimulusId, patch) => run("update_stimulus", { stimulusId, patch })} onNewDraft={() => run("new_draft")} />
      ) : null}
      {tab === "listing" ? (
        <Listing
          listing={bundle.study.listing ?? "public"}
          description={bundle.study.publicDescription ?? ""}
          minutes={bundle.study.estimatedMinutes ?? 5}
          blockers={bundle.qa?.blockers ?? []}
          onSave={(patch) => run("update_listing", patch)}
          onPublish={async () => {
            setError(null);
            try {
              await researcherApi("submit_review", { studyId });
              await researcherApi("approve", { studyId });
              await researcherApi("publish", { studyId });
              await reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : "게시하지 못했습니다.");
              await reload().catch(() => undefined);
            }
          }}
          onFill={() => run("apply_demo_fixes")}
        />
      ) : null}
      {tab === "code" ? <CodePanel code={bundle.study.joinCode} status={bundle.study.status} /> : null}
      {tab === "responses" ? <Responses studyId={studyId} /> : null}
    </section>
  );
}

function Design({
  spec,
  locked,
  onSave,
  onMeasure,
  onStimulus,
  onNewDraft
}: {
  spec: Spec;
  locked: boolean;
  onSave: (patch: { title: string; researchQuestion: string; hypotheses: string[] }) => void;
  onMeasure: (measureId: string, questionText: string) => void;
  onStimulus: (stimulusId: string, patch: { title: string; body: string }) => void;
  onNewDraft: () => void;
}) {
  const titleId = useId();
  const questionId = useId();
  const hypothesisId = useId();
  const [title, setTitle] = useState(spec.title);
  const [question, setQuestion] = useState(spec.researchQuestion);
  const [hypotheses, setHypotheses] = useState(spec.hypotheses.join("\n"));

  function saveMeta(event: FormEvent) {
    event.preventDefault();
    onSave({
      title,
      researchQuestion: question,
      hypotheses: hypotheses.split("\n")
    });
  }

  return (
    <div>
      {locked ? (
        <p className="muted">
          게시된 버전은 직접 고칠 수 없습니다.{" "}
          <button type="button" className="text-btn" onClick={onNewDraft}>
            새 초안
          </button>
        </p>
      ) : null}
      <form onSubmit={saveMeta}>
        <div className="field">
          <label htmlFor={titleId}>제목</label>
          <input id={titleId} value={title} onChange={(event) => setTitle(event.target.value)} disabled={locked} />
        </div>
        <div className="field">
          <label htmlFor={questionId}>연구 질문</label>
          <textarea id={questionId} rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} disabled={locked} />
        </div>
        <div className="field">
          <label htmlFor={hypothesisId}>가설 (한 줄에 하나)</label>
          <textarea id={hypothesisId} rows={4} value={hypotheses} onChange={(event) => setHypotheses(event.target.value)} disabled={locked} />
        </div>
        <button type="submit" className="primary" disabled={locked}>
          설계 저장
        </button>
      </form>
      <h2>문항</h2>
      {spec.measures.map((measure) => (
        <MeasureEditor key={measure.id} id={measure.id} question={measure.questionText} construct={measure.construct} disabled={locked} onSave={onMeasure} />
      ))}
      <h2>자극</h2>
      {spec.stimuli.map((stimulus) => (
        <StimulusEditor key={stimulus.id} stimulus={stimulus} disabled={locked} onSave={onStimulus} />
      ))}
    </div>
  );
}

function MeasureEditor({
  id,
  question,
  construct,
  disabled,
  onSave
}: {
  id: string;
  question: string;
  construct?: string;
  disabled: boolean;
  onSave: (measureId: string, questionText: string) => void;
}) {
  const fieldId = useId();
  const [value, setValue] = useState(question);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(id, value);
      }}
    >
      <div className="field">
        <label htmlFor={fieldId}>{construct || "문항"}</label>
        <textarea id={fieldId} rows={2} value={value} onChange={(event) => setValue(event.target.value)} disabled={disabled} />
      </div>
      <button type="submit" className="secondary" disabled={disabled}>
        문항 저장
      </button>
    </form>
  );
}

function StimulusEditor({
  stimulus,
  disabled,
  onSave
}: {
  stimulus: { id: string; title: string; body: string };
  disabled: boolean;
  onSave: (stimulusId: string, patch: { title: string; body: string }) => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const [title, setTitle] = useState(stimulus.title);
  const [body, setBody] = useState(stimulus.body);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(stimulus.id, { title, body });
      }}
    >
      <div className="field">
        <label htmlFor={titleId}>자극 제목</label>
        <input id={titleId} value={title} onChange={(event) => setTitle(event.target.value)} disabled={disabled} />
      </div>
      <div className="field">
        <label htmlFor={bodyId}>자극 본문</label>
        <textarea id={bodyId} rows={4} value={body} onChange={(event) => setBody(event.target.value)} disabled={disabled} />
      </div>
      <button type="submit" className="secondary" disabled={disabled}>
        자극 저장
      </button>
    </form>
  );
}

function Listing({
  listing,
  description,
  minutes,
  blockers,
  onSave,
  onPublish,
  onFill
}: {
  listing: "public" | "private";
  description: string;
  minutes: number;
  blockers: Array<{ code: string; message: string }>;
  onSave: (patch: { listing: "public" | "private"; publicDescription: string; estimatedMinutes: number }) => void;
  onPublish: () => void;
  onFill: () => void;
}) {
  const descriptionId = useId();
  const minutesId = useId();
  const [mode, setMode] = useState(listing);
  const [text, setText] = useState(description);
  const [mins, setMins] = useState(String(minutes));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ listing: mode, publicDescription: text, estimatedMinutes: Number(mins) });
      }}
    >
      <fieldset className="choices">
        <legend>참가자 목록</legend>
        <label>
          <input type="radio" name="listing" checked={mode === "public"} onChange={() => setMode("public")} /> 공개
        </label>
        <label>
          <input type="radio" name="listing" checked={mode === "private"} onChange={() => setMode("private")} /> 비공개
        </label>
      </fieldset>
      <div className="field">
        <label htmlFor={descriptionId}>참가자에게 보이는 설명</label>
        <textarea id={descriptionId} rows={3} maxLength={200} value={text} onChange={(event) => setText(event.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={minutesId}>예상 시간 (분)</label>
        <input id={minutesId} inputMode="numeric" value={mins} onChange={(event) => setMins(event.target.value)} />
      </div>
      <button type="submit" className="primary">
        공개 설정 저장
      </button>
      {blockers.length ? (
        <div>
          <h2>게시 전 확인할 항목</h2>
          <ul>
            {blockers.map((blocker) => (
              <li key={blocker.code}>
                {blocker.message}
              </li>
            ))}
          </ul>
          <button type="button" className="secondary" onClick={onFill}>
            빠진 행동 측정 채우기
          </button>
        </div>
      ) : null}
      <button type="button" className="primary" onClick={onPublish}>
        검토 후 게시
      </button>
    </form>
  );
}

function CodePanel({ code, status }: { code: string; status: string }) {
  const [note, setNote] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setNote("복사했습니다.");
    } catch {
      setNote("코드를 길게 눌러 선택해 주세요.");
    }
  }

  return (
    <div>
      <p className="code">{code}</p>
      <button type="button" className="secondary" onClick={copy}>
        코드 복사
      </button>
      {note ? <p role="status">{note}</p> : null}
      <p className="muted">
        {status === "published"
          ? "참가자는 이 코드로 들어옵니다. 계정은 없고, 익명 Participant ID만 부여됩니다."
          : "게시한 뒤에 이 코드로 참여할 수 있습니다."}
      </p>
    </div>
  );
}

function Responses({ studyId }: { studyId: string }) {
  const [data, setData] = useState<DataOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    researcherApi<DataOverview>("data_overview", { studyId })
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "응답을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [studyId]);

  if (error) {
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  }
  if (!data) return <p role="status">응답 불러오는 중…</p>;
  return (
    <div>
      <p>
        배정 {data.overview.totalAssigned} · 완료 {data.overview.totalCompleted}
      </p>
      <h2>익명 Participant ID</h2>
      {data.participants.length === 0 ? <p className="muted">아직 응답이 없습니다.</p> : null}
      <ul className="study-list">
        {data.participants.map((participant) => (
          <li key={participant.id} className="study-desc">
            {participant.id}
          </li>
        ))}
      </ul>
    </div>
  );
}
