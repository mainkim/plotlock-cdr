import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { handleOpenStudiesRequest } from "../lib/open-studies";
import { handleParticipantRequest } from "../lib/participant-api";
import { readDb, resetMemoryCache, withDb } from "../lib/store";
import {
  applyDemoFixes,
  approveStudy,
  createStudyFromPrompt,
  publishStudy,
  submitForReview,
  updateStudyListing
} from "../lib/study-service";
import { DEMO_PROMPT } from "../lib/ai/generator";

const savedEnv = {
  HAEBOM_STORE: process.env.HAEBOM_STORE,
  HAEBOM_DATA_DIR: process.env.HAEBOM_DATA_DIR,
  DATABASE_URL: process.env.DATABASE_URL,
  HAEBOM_AIT_APP_NAME: process.env.HAEBOM_AIT_APP_NAME,
  HAEBOM_PARTICIPANT_CORS_ORIGINS: process.env.HAEBOM_PARTICIPANT_CORS_ORIGINS,
  HAEBOM_SKIP_LITERATURE: process.env.HAEBOM_SKIP_LITERATURE,
  HAEBOM_ADMIN_KEY: process.env.HAEBOM_ADMIN_KEY
};

let dataDir = "";

function restoreEnv() {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "haebom-open-"));
  process.env.HAEBOM_STORE = "file";
  process.env.HAEBOM_DATA_DIR = dataDir;
  process.env.HAEBOM_SKIP_LITERATURE = "1";
  process.env.HAEBOM_AIT_APP_NAME = "haebomresearch";
  delete process.env.HAEBOM_PARTICIPANT_CORS_ORIGINS;
  delete process.env.DATABASE_URL;
  delete process.env.HAEBOM_ADMIN_KEY;
  resetMemoryCache();
});

afterEach(() => {
  restoreEnv();
  resetMemoryCache();
  rmSync(dataDir, { recursive: true, force: true });
});

async function publishDemo(title: string) {
  const { study } = await createStudyFromPrompt(DEMO_PROMPT, { title, isDemo: true, targetN: 40 });
  await applyDemoFixes(study.id);
  await submitForReview(study.id);
  await approveStudy(study.id);
  return publishStudy(study.id);
}

const TOSS_ORIGIN = "https://haebomresearch.apps.tossmini.com";

function openRequest(origin?: string, method = "GET") {
  const headers = new Headers();
  if (origin) headers.set("Origin", origin);
  return new Request("https://haebom.example/api/haebom/open", { method, headers });
}

describe("open study list", () => {
  it("lists published public studies and hides private, draft, and closed ones", async () => {
    const open = await publishDemo("공개 추천 연구");
    await updateStudyListing(open.study.id, {
      listing: "public",
      publicDescription: "추천 문구를 읽고 짧게 답합니다.",
      estimatedMinutes: 5
    });
    await withDb((db) => {
      const study = db.studies.find((item) => item.id === open.study.id);
      if (!study) throw new Error("missing study");
      study.founderNote = "FOUNDER_SECRET_NOTE";
      const version = db.versions.find((item) => item.id === study.currentVersionId);
      if (!version) throw new Error("missing version");
      version.spec.researchQuestion = "RQ_SECRET_HYPOTHESIS";
      version.spec.hypotheses = ["SECRET_MANIPULATION"];
    });

    const hidden = await publishDemo("비공개 코드 연구");
    await updateStudyListing(hidden.study.id, { listing: "private" });
    await withDb((db) => {
      const study = db.studies.find((item) => item.id === hidden.study.id);
      if (!study) throw new Error("missing private study");
      study.joinCode = "PRIV8CODE";
    });

    const draft = await createStudyFromPrompt(DEMO_PROMPT, { title: "아직 초안", isDemo: false });
    const closed = await publishDemo("마감된 연구");
    await withDb((db) => {
      const study = db.studies.find((item) => item.id === closed.study.id);
      if (!study) throw new Error("missing closed study");
      study.status = "closed";
    });

    const legacy = await publishDemo("표시값 없는 기존 연구");
    await withDb((db) => {
      const study = db.studies.find((item) => item.id === legacy.study.id);
      if (!study) throw new Error("missing legacy study");
      delete study.listing;
    });

    const res = await handleOpenStudiesRequest(openRequest(TOSS_ORIGIN));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("access-control-allow-origin"), TOSS_ORIGIN);
    assert.match(res.headers.get("access-control-allow-methods") ?? "", /GET/);

    const body = (await res.json()) as { studies: Array<Record<string, unknown>> };
    const titles = body.studies.map((study) => study.title);
    assert.ok(titles.includes("공개 추천 연구"));
    assert.ok(titles.includes("표시값 없는 기존 연구"));
    assert.equal(titles.includes("비공개 코드 연구"), false);
    assert.equal(titles.includes("아직 초안"), false);
    assert.equal(titles.includes(draft.study.title), false);
    assert.equal(titles.includes("마감된 연구"), false);

    const text = JSON.stringify(body);
    assert.equal(text.includes("FOUNDER_SECRET_NOTE"), false);
    assert.equal(text.includes("RQ_SECRET_HYPOTHESIS"), false);
    assert.equal(text.includes("SECRET_MANIPULATION"), false);
    assert.equal(text.includes("PRIV8CODE"), false);
    assert.equal(text.includes("userKey"), false);
    assert.equal(text.includes("targetN"), false);
    assert.equal(text.includes("conditionId"), false);

    const card = body.studies.find((study) => study.title === "공개 추천 연구");
    assert.deepEqual(Object.keys(card ?? {}).sort(), ["description", "estimatedMinutes", "id", "joinCode", "title"]);
    assert.equal(card?.description, "추천 문구를 읽고 짧게 답합니다.");
    assert.equal(card?.estimatedMinutes, 5);
    assert.equal(card?.joinCode, open.study.joinCode);

    const legacyCard = body.studies.find((study) => study.title === "표시값 없는 기존 연구");
    assert.equal(legacyCard?.description, undefined);
    assert.equal(legacyCard?.estimatedMinutes, undefined);
    assert.equal(typeof legacyCard?.joinCode, "string");
  });

  it("joins a listed study with an anonymous participant id and no Toss user id", async () => {
    const open = await publishDemo("익명 참여 연구");
    const listed = await handleOpenStudiesRequest(openRequest());
    const body = (await listed.json()) as { studies: Array<{ joinCode: string }> };
    const joinCode = body.studies.find((study) => study.joinCode === open.study.joinCode)?.joinCode;
    assert.equal(joinCode, open.study.joinCode);

    const joined = await handleParticipantRequest(
      new Request("https://haebom.example/api/participant", {
        method: "POST",
        headers: { "content-type": "application/json", origin: TOSS_ORIGIN },
        body: JSON.stringify({ action: "join", joinCode, channel: "toss_miniapp" })
      })
    );
    assert.equal(joined.status, 200);
    const view = (await joined.json()) as { participantId: string };
    assert.match(view.participantId, /^par_/);
    const stored = (await readDb()).participants.find((item) => item.id === view.participantId);
    assert.equal(stored?.channel, "toss_miniapp");
    assert.equal(stored?.externalAuthRef, undefined);
    assert.equal(JSON.stringify(view).includes("userKey"), false);
  });

  it("rejects a foreign origin and does not require the researcher admin key", async () => {
    await publishDemo("출처 확인 연구");
    const blocked = await handleOpenStudiesRequest(openRequest("https://evil.example"));
    assert.equal(blocked.status, 403);
    const blockedBody = await blocked.json();
    assert.equal(JSON.stringify(blockedBody).includes("joinCode"), false);

    const open = await handleOpenStudiesRequest(openRequest());
    assert.equal(open.status, 200);

    const options = await handleOpenStudiesRequest(openRequest(TOSS_ORIGIN, "OPTIONS"));
    assert.equal(options.status, 204);
  });
});
