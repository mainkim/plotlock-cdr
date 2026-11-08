import type { FormEvent } from "react";
import type { OpenStudyCard } from "./api";
import { ShareButton } from "./ShareButton";

export function HomeScreen({
  draft,
  error,
  studies,
  studiesError,
  joining,
  onDraft,
  onSubmit,
  onJoinStudy
}: {
  draft: string;
  error: string | null;
  studies: OpenStudyCard[] | null;
  studiesError: boolean;
  joining: boolean;
  onDraft: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onJoinStudy: (joinCode: string) => void;
}) {
  return (
    <main className="app">
      <div className="home-top">
        <p className="brand">해봄리서치</p>
        <ShareButton />
      </div>
      <h1>참여할 연구</h1>
      {studies === null ? (
        <p className="hint" role="status">
          열린 연구를 불러오는 중
        </p>
      ) : studiesError ? (
        <p className="hint" role="status">
          열린 연구를 불러오지 못했어요. 참여 코드로 들어올 수 있습니다.
        </p>
      ) : studies.length === 0 ? (
        <p className="hint" role="status">
          지금 열려 있는 연구가 없습니다.
        </p>
      ) : (
        <ul className="study-list">
          {studies.map((study) => (
            <li key={study.id}>
              <button type="button" className="study-row" disabled={joining} onClick={() => onJoinStudy(study.joinCode)}>
                <span className="study-title">{study.title}</span>
                {study.description ? <span className="study-desc">{study.description}</span> : null}
                {study.estimatedMinutes ? <span className="study-time">약 {study.estimatedMinutes}분</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-label">참여 코드</h2>
      <p id="join-code-hint" className="hint">
        비공개 연구는 연구자에게 받은 코드로 참여합니다.
      </p>
      <form className="join-form" onSubmit={onSubmit} noValidate>
        <label className="code-label" htmlFor="join-code">
          참여 코드
        </label>
        <input
          id="join-code"
          name="joinCode"
          value={draft}
          onChange={(event) => onDraft(event.target.value)}
          aria-describedby={error ? "join-code-hint join-code-error" : "join-code-hint"}
          aria-invalid={error ? true : undefined}
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          inputMode="text"
          maxLength={24}
        />
        {error ? (
          <p id="join-code-error" className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="primary" type="submit" disabled={joining}>
          참여 시작
        </button>
      </form>
    </main>
  );
}
