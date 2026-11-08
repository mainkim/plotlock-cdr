import { authOptions, session } from "@/lib/researcher-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(req: Request) {
  return authOptions(req);
}

export function GET(req: Request) {
  return session(req);
}
