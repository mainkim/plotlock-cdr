/**
 * HTTP-handler smoke for researcher ownership.
 * Uses a temp data dir so it does not touch data/haebom.json.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { chdir } from "node:process";
import { DEMO_PROMPT } from "../lib/ai/generator";

const dir = mkdtempSync(`${tmpdir()}/haebom-auth-`);
chdir(dir);

type Json = Record<string, unknown>;

function call(handler: (req: Request) => Promise<Response> | Response, url: string, init?: RequestInit) {
  return Promise.resolve(handler(new Request(url, init)));
}

async function bodyOf(res: Response): Promise<Json> {
  return (await res.json()) as Json;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
process.env.NODE_ENV = "development";
const { POST, GET } = await import("../app/api/haebom/route");
const { requestCode, verifyCode } = await import("../lib/researcher-routes");
const open = await import("../app/api/haebom/open/route");

const requested = await call(requestCode, "http://localhost/api/haebom/auth/request-code", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "owner@lab.edu" })
});
const requestedBody = await bodyOf(requested);
assert(requested.status === 200, `request-code ${requested.status}`);
assert(typeof requestedBody.devCode === "string", "dev code missing outside production");

const otherRequested = await call(requestCode, "http://localhost/api/haebom/auth/request-code", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "other@lab.edu" })
});
const otherBody = await bodyOf(otherRequested);

const ownerVerified = await call(verifyCode, "http://localhost/api/haebom/auth/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "owner@lab.edu", code: requestedBody.devCode })
});
const owner = await bodyOf(ownerVerified);
assert(ownerVerified.status === 200 && typeof owner.token === "string", "owner verify failed");

const otherVerified = await call(verifyCode, "http://localhost/api/haebom/auth/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "other@lab.edu", code: otherBody.devCode })
});
const other = await bodyOf(otherVerified);
assert(typeof other.token === "string", "other verify failed");

const anonList = await call(GET, "http://localhost/api/haebom");
assert(anonList.status === 401, "anonymous list should be 401");

const createdRes = await call(POST, "http://localhost/api/haebom", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${owner.token}` },
  body: JSON.stringify({ action: "create_from_prompt", prompt: DEMO_PROMPT, title: "소유 연구" })
});
const created = await bodyOf(createdRes);
const study = created.study as { id?: string; joinCode?: string; ownerResearcherId?: string };
assert(createdRes.status === 200 && study?.id, `create failed ${createdRes.status} ${JSON.stringify(created)}`);
assert(!JSON.stringify(created).includes("owner@lab.edu"), "study payload included researcher email");

const ownerList = await bodyOf(
  await call(GET, "http://localhost/api/haebom", { headers: { Authorization: `Bearer ${owner.token}` } })
);
const ownerStudies = ownerList.studies as Array<{ id: string }>;
assert(ownerStudies.some((item) => item.id === study.id), "owner cannot see their study");

const otherList = await bodyOf(
  await call(GET, "http://localhost/api/haebom", { headers: { Authorization: `Bearer ${other.token}` } })
);
const otherStudies = otherList.studies as Array<{ id: string }>;
assert(!otherStudies.some((item) => item.id === study.id), "other researcher saw the study");

const stolen = await call(POST, "http://localhost/api/haebom", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${other.token}` },
  body: JSON.stringify({ action: "get_bundle", studyId: study.id })
});
assert(stolen.status === 404, "other researcher read the bundle");

const listed = await call(POST, "http://localhost/api/haebom", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${owner.token}` },
  body: JSON.stringify({
    action: "update_listing",
    studyId: study.id,
    listing: "public",
    publicDescription: "참가자에게 보이는 설명",
    estimatedMinutes: 6
  })
});
assert(listed.status === 200, "listing update failed");

const join = await call(POST, "http://localhost/api/haebom", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "join", joinCode: study.joinCode })
});
const joinBody = await bodyOf(join);
assert(join.status === 400, "unpublished join should stay closed");
assert(typeof joinBody.error === "string", "join error missing");

const catalog = await call(open.GET, "http://localhost/api/haebom/open");
const catalogBody = await bodyOf(catalog);
const cards = catalogBody.studies as Array<{ id: string }>;
assert(catalog.status === 200, "open catalog failed");
assert(!cards.some((item) => item.id === study.id), "draft study leaked into the open catalog");

console.log(JSON.stringify({ ok: true, studyId: study.id, dir }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
