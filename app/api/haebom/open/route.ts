import { NextResponse } from "next/server";
import { applyCors, originAllowed } from "@/lib/miniapp-cors";
import { listOpenStudies } from "@/lib/open-studies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function allowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  if (originAllowed(origin)) return true;
  try {
    return new URL(req.url).origin === origin;
  } catch {
    return false;
  }
}

function json(req: Request, body: unknown, status = 200) {
  const res = NextResponse.json(body, { status });
  applyCors(req, res.headers, "GET, OPTIONS");
  return res;
}

export function OPTIONS(req: Request) {
  const res = new NextResponse(null, { status: allowed(req) ? 204 : 403 });
  applyCors(req, res.headers, "GET, OPTIONS");
  return res;
}

export function GET(req: Request) {
  if (!allowed(req)) return json(req, { error: "이 출처에서는 볼 수 없습니다." }, 403);
  return json(req, { studies: listOpenStudies() });
}
