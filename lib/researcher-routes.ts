import { NextResponse } from "next/server";
import { applyCors } from "./miniapp-cors";
import {
  cookieHeader,
  devEchoAllowed,
  invalidateLoginCode,
  issueLoginCode,
  mailerConfigured,
  normalizeEmail,
  readResearcher,
  revokeToken,
  sendLoginCode,
  SESSION_TTL_MS,
  tokenFromHeaders,
  verifyLoginCode,
  withResearcherDb
} from "./researcher-auth";

function json(req: Request, body: unknown, status = 200, setCookie?: string) {
  const res = NextResponse.json(body, { status });
  applyCors(req, res.headers, "GET, POST, OPTIONS");
  if (setCookie) res.headers.append("Set-Cookie", setCookie);
  return res;
}

export function authOptions(req: Request) {
  const res = new NextResponse(null, { status: 204 });
  applyCors(req, res.headers, "GET, POST, OPTIONS");
  return res;
}

export async function requestCode(req: Request) {
  let email = "";
  try {
    const body = await req.json();
    email = normalizeEmail(body?.email) ?? "";
  } catch {
    return json(req, { error: "잘못된 요청입니다." }, 400);
  }
  if (!email) return json(req, { error: "이메일 주소를 확인해 주세요." }, 400);

  const issued = withResearcherDb((db) => issueLoginCode(db, email));
  if (!issued.ok) return json(req, { error: issued.error }, issued.status);

  if (devEchoAllowed()) {
    return json(req, { ok: true, devCode: issued.code });
  }
  if (!mailerConfigured()) {
    withResearcherDb((db) => invalidateLoginCode(db, email));
    return json(req, { error: "이메일 발송이 설정되지 않았습니다. RESEND_API_KEY와 HAEBOM_AUTH_EMAIL_FROM이 필요합니다." }, 503);
  }
  const sent = await sendLoginCode(email, issued.code);
  if (!sent) {
    withResearcherDb((db) => invalidateLoginCode(db, email));
    return json(req, { error: "로그인 코드를 보내지 못했습니다." }, 503);
  }
  return json(req, { ok: true });
}

export async function verifyCode(req: Request) {
  let email = "";
  let code = "";
  try {
    const body = await req.json();
    email = typeof body?.email === "string" ? body.email : "";
    code = typeof body?.code === "string" ? body.code : "";
  } catch {
    return json(req, { error: "잘못된 요청입니다." }, 400);
  }
  const result = withResearcherDb((db) => verifyLoginCode(db, email, code));
  if (!result.ok) return json(req, { error: result.error }, result.status);
  return json(
    req,
    { ok: true, token: result.token, researcher: result.researcher },
    200,
    cookieHeader(result.token, Math.floor(SESSION_TTL_MS / 1000))
  );
}

export function session(req: Request) {
  const researcher = readResearcher(req.headers);
  if (!researcher) return json(req, { error: "인증이 필요합니다." }, 401);
  return json(req, { ok: true, researcher: { id: researcher.id, email: researcher.email } });
}

export function logout(req: Request) {
  const token = tokenFromHeaders(req.headers);
  if (token) withResearcherDb((db) => revokeToken(db, token));
  return json(req, { ok: true }, 200, cookieHeader("", 0));
}
