import { authOptions, logout } from "@/lib/researcher-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(req: Request) {
  return authOptions(req);
}

export function POST(req: Request) {
  return logout(req);
}
