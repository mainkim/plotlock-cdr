import { useEffect, useId, useState, type FormEvent } from "react";
import {
  listMyStudies,
  loadSession,
  logout,
  requestCode,
  researcherApi,
  verifyCode,
  type Researcher,
  type StudyRow
} from "./api";
import { StudyScreen } from "./StudyScreen";

type Screen =
  | { name: "login" }
  | { name: "list" }
  | { name: "create" }
  | { name: "study"; id: string };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "login" });
  const [researcher, setResearcher] = useState<Researcher | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSession()
      .then((session) => {
        if (cancelled) return;
        if (session) {
          setResearcher(session);
          setScreen({ name: "list" });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    await logout();
    setResearcher(null);
    setScreen({ name: "login" });
  }

  if (!ready) {
    return (
      <main className="app">
        <p role="status">확인 중…</p>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="home-top">
        <div>
          <p className="brand">해봄 연구자</p>
          <p className="english">Haebom Lab</p>
        </div>
        {researcher ? (
          <button type="button" className="text-btn" onClick={signOut}>
            나가기
          </button>
        ) : null}
      </header>
      <p className="tagline">대학원생을 위한 실험설문 설계</p>
      {screen.name === "login" ? (
        <Login
          onDone={(next) => {
            setResearcher(next);
            setScreen({ name: "list" });
          }}
        />
      ) : null}
      {screen.name === "list" ? (
        <StudyList
          onCreate={() => setScreen({ name: "create" })}
          onOpen={(id) => setScreen({ name: "study", id })}
        />
      ) : null}
      {screen.name === "create" ? (
        <CreateStudy
          onCancel={() => setScreen({ name: "list" })}
          onCreated={(id) => setScreen({ name: "study", id })}
        />
      ) : null}
      {screen.name === "study" ? <StudyScreen studyId={screen.id} onBack={() => setScreen({ name: "list" })} /> : null}
    </main>
  );
}

function Login({ onDone }: { onDone: (researcher: Researcher) => void }) {
  const emailId = useId();
  const codeId = useId();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(event: { preventDefault(): void }) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDevCode(null);
    try {
      const result = await requestCode(email);
      if (result.devCode) setDevCode(result.devCode);
      setInfo("코드를 보냈습니다. 10분 안에 입력해 주세요.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "코드를 보내지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onDone(await verifyCode(email, code));
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h1>이메일로 들어가기</h1>
      <p className="muted">이메일 코드로 로그인합니다. 참가자는 익명 Participant ID만 갖습니다.</p>
      <div className="field">
        <label htmlFor={emailId}>이메일</label>
        <input id={emailId} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </div>
      <button type="button" className="secondary" onClick={send} disabled={busy || !email.includes("@")}>
        코드 받기
      </button>
      <div className="field">
        <label htmlFor={codeId}>로그인 코드</label>
        <input
          id={codeId}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          minLength={6}
          maxLength={6}
          required
        />
      </div>
      {devCode ? <p role="status">이 개발 환경에서는 코드가 화면에 표시됩니다: {devCode}</p> : null}
      {info ? <p role="status">{info}</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="primary" disabled={busy || code.trim().length !== 6}>
        {busy ? "확인 중…" : "들어가기"}
      </button>
    </form>
  );
}

function StudyList({ onCreate, onOpen }: { onCreate: () => void; onOpen: (id: string) => void }) {
  const [studies, setStudies] = useState<StudyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyStudies()
      .then((rows) => {
        if (!cancelled) setStudies(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "연구를 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <div className="row-head">
        <h1>내 연구</h1>
        <button type="button" className="primary" onClick={onCreate}>
          새 연구
        </button>
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {studies === null && !error ? <p role="status">불러오는 중…</p> : null}
      {studies && studies.length === 0 ? <p className="muted">아직 연구가 없습니다. 가설로 초안을 만들어 보세요.</p> : null}
      <ul className="study-list">
        {(studies ?? []).map((study) => (
          <li key={study.id}>
            <button type="button" className="study-row" onClick={() => onOpen(study.id)}>
              <span className="study-title">{study.title}</span>
              <span className="study-desc">
                {study.status} · 참여 코드 {study.joinCode} · 완료 {study.completedN ?? 0}/{study.targetN}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CreateStudy({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const titleId = useId();
  const promptId = useId();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await researcherApi<{ study: { id: string } }>("create_from_prompt", {
        prompt,
        title: title.trim() || undefined
      });
      onCreated(result.study.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "초안을 만들지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <button type="button" className="text-btn" onClick={onCancel}>
        뒤로
      </button>
      <h1>연구 초안</h1>
      <p className="muted">가설을 적으면 설문과 실험 조건 초안이 만들어집니다. AI 초안은 타당성이나 IRB를 보장하지 않습니다.</p>
      <div className="field">
        <label htmlFor={titleId}>제목</label>
        <input id={titleId} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} />
      </div>
      <div className="field">
        <label htmlFor={promptId}>가설</label>
        <textarea id={promptId} value={prompt} onChange={(event) => setPrompt(event.target.value)} required rows={6} />
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="primary" disabled={busy || prompt.trim().length < 8}>
        {busy ? "만드는 중…" : "초안 만들기"}
      </button>
    </form>
  );
}
