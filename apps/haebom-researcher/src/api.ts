const TOKEN_KEY = "haebom_researcher_token";

export type Researcher = { id: string; email: string };

export type StudyRow = {
  id: string;
  title: string;
  status: string;
  joinCode: string;
  targetN: number;
  completedN?: number;
  assignedN?: number;
  designLabel?: string;
  listing?: "public" | "private";
  updatedAt: string;
};

export type Measure = {
  id: string;
  questionText: string;
  construct?: string;
  type?: string;
};

export type Stimulus = {
  id: string;
  title: string;
  body: string;
  conditionId?: string;
};

export type Spec = {
  title: string;
  researchQuestion: string;
  hypotheses: string[];
  measures: Measure[];
  stimuli: Stimulus[];
};

export type StudyBundle = {
  study: StudyRow & {
    publicDescription?: string;
    estimatedMinutes?: number;
  };
  draft?: { status: string; spec: Spec };
  current?: { status: string; spec: Spec };
  qa?: { blockers: Array<{ code: string; message: string }> };
};

export type DataOverview = {
  overview: {
    totalAssigned: number;
    totalCompleted: number;
    completionRate: number;
    dropoutRate: number;
  };
  participants: Array<{ id: string; createdAt: string }>;
};

export function apiBase(): string {
  const configured = import.meta.env.VITE_HAEBOM_API_BASE?.trim();
  if (configured) {
    const base = configured.replace(/\/$/, "");
    if (!import.meta.env.DEV && !base.startsWith("https://")) {
      throw new Error("연구 서버 주소는 HTTPS여야 합니다.");
    }
    return base;
  }
  if (import.meta.env.DEV) return "http://localhost:3000";
  return "https://haebom-api.vercel.app";
}

export function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeToken(token: string | null) {
  try {
    if (!token) sessionStorage.removeItem(TOKEN_KEY);
    else sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* private mode */
  }
}

async function parse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    if (res.status === 404 && !data.error) throw new Error("연구자 인증 API가 아직 이 서버에 없습니다.");
    throw new Error(data.error || "요청에 실패했습니다.");
  }
  return data as T;
}

function authHeaders(): Headers {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = readToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

export async function requestCode(email: string): Promise<{ devCode?: string }> {
  const res = await fetch(`${apiBase()}/api/haebom/auth/request-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  return parse(res);
}

export async function verifyCode(email: string, code: string): Promise<Researcher> {
  const res = await fetch(`${apiBase()}/api/haebom/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code })
  });
  const data = await parse<{ token: string; researcher: Researcher }>(res);
  writeToken(data.token);
  return data.researcher;
}

export async function loadSession(): Promise<Researcher | null> {
  if (!readToken()) return null;
  const res = await fetch(`${apiBase()}/api/haebom/auth/session`, { headers: authHeaders() });
  if (res.status === 401) {
    writeToken(null);
    return null;
  }
  const data = await parse<{ researcher: Researcher }>(res);
  return data.researcher;
}

export async function logout() {
  const headers = authHeaders();
  writeToken(null);
  if (!headers.get("Authorization")) return;
  await fetch(`${apiBase()}/api/haebom/auth/logout`, { method: "POST", headers }).catch(() => undefined);
}

export async function researcherApi<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${apiBase()}/api/haebom`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ action, ...body })
  });
  if (res.status === 401) writeToken(null);
  return parse<T>(res);
}

export async function listMyStudies(): Promise<StudyRow[]> {
  const res = await fetch(`${apiBase()}/api/haebom`, { headers: authHeaders(), cache: "no-store" });
  if (res.status === 401) writeToken(null);
  const data = await parse<{ studies: StudyRow[] }>(res);
  return data.studies ?? [];
}
