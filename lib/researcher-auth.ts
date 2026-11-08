import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { newId, withDb, withDbRead } from "./store";
import type { DbShape, ResearcherAccount } from "./types";

/**
 * Researcher auth is an email one-time code plus a bearer/cookie session.
 * It does not use Toss login. Participants stay anonymous Participant IDs;
 * researcher email is stored only on the researcher account, never on a study join.
 */

export const RESEARCHER_COOKIE = "haebom_researcher";
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;
export const MAX_CODES_PER_HOUR = 5;

const PARTICIPANT_ACTIONS = new Set(["join", "runtime", "consent", "submit_step", "events"]);

export type AuthFailure = { ok: false; status: 400 | 401 | 429 | 503; error: string };
export type IssuedCode = { ok: true; code: string };
export type VerifiedSession = {
  ok: true;
  token: string;
  researcher: { id: string; email: string };
};

export function participantAction(action: string): boolean {
  return PARTICIPANT_ACTIONS.has(action);
}

/** Production never echoes the code, even if the dev flag is set. */
type AuthEnv = {
  NODE_ENV?: string;
  HAEBOM_AUTH_DEV_ECHO?: string;
  HAEBOM_ALLOW_LEGACY_CLAIM?: string;
};

export function devEchoAllowed(env: AuthEnv = process.env): boolean {
  if (env.NODE_ENV === "production" || env.HAEBOM_AUTH_DEV_ECHO === "0") return false;
  if (env.HAEBOM_AUTH_DEV_ECHO === "1") return true;
  return env.NODE_ENV === "development" || env.NODE_ENV === "test";
}

export function legacyClaimEnabled(env: AuthEnv = process.env): boolean {
  return env.HAEBOM_ALLOW_LEGACY_CLAIM === "1";
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  if (email.includes(" ") || email.includes("\n") || email.includes("\r")) return null;
  const match = /^([^@]+)@([^@]+)$/.exec(email);
  if (!match) return null;
  const [, local, domain] = match;
  if (!local || !domain || !domain.includes(".")) return null;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return null;
  if (!/^[a-z0-9.-]+$/i.test(domain)) return null;
  return email;
}

export function studyOwnedBy(study: { ownerResearcherId?: string } | null | undefined, researcherId: string): boolean {
  return Boolean(study && study.ownerResearcherId === researcherId);
}

function ensurePepper(db: DbShape): string {
  if (!db.meta.authPepper) db.meta.authPepper = randomBytes(32).toString("base64url");
  return db.meta.authPepper;
}

function codeHash(pepper: string, email: string, code: string): string {
  return createHmac("sha256", pepper).update(`${email}:${code}`).digest("base64url");
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

function hashesEqual(left: string, right: string): boolean {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

function pruneAuth(db: DbShape, now: number) {
  const keepCodesAfter = now - 60 * 60 * 1000;
  db.researcherCodes = db.researcherCodes.filter((row) => Date.parse(row.sentAt) > keepCodesAfter);
  db.researcherSessions = db.researcherSessions.filter((row) => Date.parse(row.expiresAt) > now);
}

export function issueLoginCode(db: DbShape, email: string, now = new Date(), code = String(randomInt(0, 1_000_000)).padStart(6, "0")): IssuedCode | AuthFailure {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, status: 400, error: "이메일 주소를 확인해 주세요." };
  if (!/^\d{6}$/.test(code)) return { ok: false, status: 400, error: "코드를 만들지 못했습니다." };

  pruneAuth(db, now.getTime());
  const hourAgo = now.getTime() - 60 * 60 * 1000;
  const sentRecently = db.researcherCodes.filter((row) => row.email === normalized && Date.parse(row.sentAt) >= hourAgo);
  if (sentRecently.length >= MAX_CODES_PER_HOUR) {
    return { ok: false, status: 429, error: "잠시 후 다시 요청해 주세요." };
  }

  for (const row of db.researcherCodes) {
    if (row.email === normalized) row.consumed = true;
  }
  const pepper = ensurePepper(db);
  db.researcherCodes.push({
    id: newId("code"),
    email: normalized,
    codeHash: codeHash(pepper, normalized, code),
    expiresAt: new Date(now.getTime() + CODE_TTL_MS).toISOString(),
    attempts: 0,
    sentAt: now.toISOString()
  });
  return { ok: true, code };
}

export function invalidateLoginCode(db: DbShape, email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  for (const row of db.researcherCodes) {
    if (row.email === normalized) row.consumed = true;
  }
}

export function verifyLoginCode(
  db: DbShape,
  email: string,
  code: string,
  now = new Date(),
  token = `hb_${randomBytes(32).toString("base64url")}`
): VerifiedSession | AuthFailure {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, status: 400, error: "이메일 주소를 확인해 주세요." };
  const presented = code.trim();
  if (!/^\d{6}$/.test(presented)) return { ok: false, status: 401, error: "코드가 맞지 않습니다." };

  pruneAuth(db, now.getTime());
  const row = [...db.researcherCodes].reverse().find((item) => item.email === normalized && !item.consumed);
  if (!row || Date.parse(row.expiresAt) <= now.getTime()) {
    return { ok: false, status: 401, error: "코드가 맞지 않습니다." };
  }
  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    row.consumed = true;
    return { ok: false, status: 401, error: "코드가 맞지 않습니다." };
  }

  const pepper = ensurePepper(db);
  const expected = codeHash(pepper, normalized, presented);
  if (!hashesEqual(row.codeHash, expected)) {
    row.attempts += 1;
    if (row.attempts >= MAX_CODE_ATTEMPTS) row.consumed = true;
    return { ok: false, status: 401, error: "코드가 맞지 않습니다." };
  }

  row.consumed = true;
  let researcher = db.researchers.find((item) => item.email === normalized);
  if (!researcher) {
    researcher = { id: newId("res"), email: normalized, createdAt: now.toISOString() };
    db.researchers.push(researcher);
  }
  const cleanToken = token.trim();
  if (cleanToken.length < 20) return { ok: false, status: 400, error: "세션을 만들지 못했습니다." };
  db.researcherSessions.push({
    id: newId("sesn"),
    researcherId: researcher.id,
    tokenHash: tokenHash(cleanToken),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString()
  });
  return { ok: true, token: cleanToken, researcher: { id: researcher.id, email: researcher.email } };
}

export function researcherFromToken(db: DbShape, token: string | null, now = new Date()): ResearcherAccount | null {
  if (!token) return null;
  const hash = tokenHash(token.trim());
  const session = db.researcherSessions.find((row) => row.tokenHash === hash && Date.parse(row.expiresAt) > now.getTime());
  if (!session) return null;
  return db.researchers.find((row) => row.id === session.researcherId) ?? null;
}

export function revokeToken(db: DbShape, token: string | null) {
  if (!token) return;
  const hash = tokenHash(token.trim());
  db.researcherSessions = db.researcherSessions.filter((row) => row.tokenHash !== hash);
}

export function claimUnownedStudies(db: DbShape, researcherId: string, now = new Date()): number {
  let claimed = 0;
  for (const study of db.studies) {
    if (study.ownerResearcherId) continue;
    study.ownerResearcherId = researcherId;
    study.updatedAt = now.toISOString();
    claimed += 1;
  }
  return claimed;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const value = part.slice(eq + 1).trim();
    return value || null;
  }
  return null;
}

export function tokenFromHeaders(headers: { get(name: string): string | null }): string | null {
  const authorization = headers.get("authorization");
  if (authorization) {
    const match = /^Bearer\s+(\S+)\s*$/i.exec(authorization);
    if (match?.[1]) return match[1];
  }
  return readCookie(headers.get("cookie"), RESEARCHER_COOKIE);
}

export function readResearcher(headers: { get(name: string): string | null }, now = new Date()): ResearcherAccount | null {
  const token = tokenFromHeaders(headers);
  if (!token) return null;
  return withDbRead((db) => researcherFromToken(db, token, now));
}

export function cookieHeader(token: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${RESEARCHER_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}

export function mailerConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.RESEND_API_KEY?.trim() && env.HAEBOM_AUTH_EMAIL_FROM?.trim());
}

export async function sendLoginCode(email: string, code: string, env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const key = env.RESEND_API_KEY?.trim();
  const from = env.HAEBOM_AUTH_EMAIL_FROM?.trim();
  if (!key || !from) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "해봄 연구자 로그인 코드",
      text: `해봄 연구자 로그인 코드: ${code}\n10분 안에 입력해 주세요.\n이 코드는 연구 참가자에게 전달하지 마세요.`
    })
  });
  return res.ok;
}

export function withResearcherDb<T>(fn: (db: DbShape) => T): T {
  return withDb(fn);
}
