import { handleOpenStudiesRequest } from "@/lib/open-studies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handleOpenStudiesRequest(req);
}

export function OPTIONS(req: Request) {
  return handleOpenStudiesRequest(req);
}
