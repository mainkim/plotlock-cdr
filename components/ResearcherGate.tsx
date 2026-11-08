"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";

type GateState = "loading" | "in" | "out";

function isOpenPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/about" || pathname === "/pricing" || pathname === "/toss" || pathname.startsWith("/p/");
}

export function ResearcherGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const emailId = useId();
  const codeId = useId();
  const errorId = useId();
  const [state, setState] = useState<GateState>("loading");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isOpenPath(pathname)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/haebom/auth/session", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as { researcher?: { email?: string } };
        if (cancelled) return;
        if (res.ok) {
          setAccountEmail(data.researcher?.email ?? null);
          setState("in");
        } else {
          setState("out");
        }
      } catch {
        if (!cancelled) setState("out");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (isOpenPath(pathname)) return children;
  if (state === "loading") {
    return (
      <div className="login-screen">
        <p role="status">연구자 세션 확인 중…</p>
      </div>
    );
  }

  async function requestCode(event: { preventDefault(): void }) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    setDevCode(null);
    try {
      const res = await fetch("/api/haebom/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; devCode?: string };
      if (!res.ok) {
        setError(data.error || "코드를 보내지 못했습니다.");
        return;
      }
      if (data.devCode) setDevCode(data.devCode);
      setInfo("코드를 보냈습니다. 10분 안에 입력해 주세요.");
    } catch {
      setError("요청을 보내지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/haebom/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code })
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; researcher?: { email?: string } };
      if (!res.ok) {
        setError(data.error || "인증에 실패했습니다.");
        return;
      }
      setAccountEmail(data.researcher?.email ?? email);
      setCode("");
      setDevCode(null);
      setState("in");
    } catch {
      setError("입장 요청을 보내지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/haebom/auth/logout", { method: "POST", credentials: "include" });
    setAccountEmail(null);
    setState("out");
  }

  if (state === "in") {
    return (
      <>
        <div className="researcher-session-bar">
          <span>{accountEmail}</span>
          <button type="button" onClick={logout}>
            나가기
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="login-screen">
      <form className="panel login-card" onSubmit={verify}>
        <p className="brand-lockup">해봄 연구자</p>
        <h1>연구자 입장</h1>
        <p className="muted">이메일로 받은 코드로만 내 연구에 들어갑니다. 토스 로그인은 쓰지 않습니다.</p>
        <div className="field">
          <label htmlFor={emailId}>이메일</label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <button className="outline-btn" type="button" onClick={requestCode} disabled={busy || !email.includes("@")}>
          코드 받기
        </button>
        <div className="field">
          <label htmlFor={codeId}>로그인 코드</label>
          <input
            id={codeId}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
            minLength={6}
            maxLength={6}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        {devCode ? (
          <p role="status" className="alert">
            이 개발 환경에서는 코드가 화면에 표시됩니다: {devCode}
          </p>
        ) : null}
        {info ? <p role="status">{info}</p> : null}
        {error ? (
          <div id={errorId} className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : null}
        <button className="primary-btn" type="submit" disabled={busy || code.trim().length !== 6}>
          {busy ? "확인 중…" : "들어가기"}
        </button>
      </form>
    </div>
  );
}
