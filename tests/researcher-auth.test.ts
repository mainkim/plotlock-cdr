import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emptyDb } from "../lib/store";
import {
  claimUnownedStudies,
  devEchoAllowed,
  issueLoginCode,
  legacyClaimEnabled,
  normalizeEmail,
  participantAction,
  studyOwnedBy,
  verifyLoginCode,
  researcherFromToken
} from "../lib/researcher-auth";
import { openStudyCard } from "../lib/open-studies";
import { originAllowed } from "../lib/miniapp-cors";
import type { Study, StudyVersion } from "../lib/types";

const now = new Date("2026-11-08T00:00:00.000Z");

function study(partial: Partial<Study> = {}): Study {
  return {
    id: "stu_1",
    title: "출처 표기",
    slug: "src",
    joinCode: "AB12CD34",
    status: "draft",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    targetN: 40,
    currentVersionId: "ver_1",
    latestDraftVersionId: "ver_1",
    ...partial
  };
}

describe("researcher auth", () => {
  it("issues a code that is stored only as a hash", () => {
    const db = emptyDb();
    const issued = issueLoginCode(db, "Lab@University.ac.kr", now, "042013");
    assert.equal(issued.ok, true);
    if (!issued.ok) return;
    assert.equal(issued.code, "042013");
    const saved = JSON.stringify(db);
    assert.equal(saved.includes("042013"), false);
    assert.equal(saved.includes("lab@university.ac.kr"), true);
    assert.equal(db.researchers.length, 0);
  });

  it("creates a researcher on verify and rejects the same code twice", () => {
    const db = emptyDb();
    issueLoginCode(db, "lab@university.ac.kr", now, "042013");
    const verified = verifyLoginCode(db, "lab@university.ac.kr", "042013", now, "hb_testtoken_0123456789abcdef");
    assert.equal(verified.ok, true);
    if (!verified.ok) return;
    assert.equal(verified.researcher.email, "lab@university.ac.kr");
    assert.equal(JSON.stringify(db).includes("hb_testtoken_0123456789abcdef"), false);
    const again = verifyLoginCode(db, "lab@university.ac.kr", "042013", now, "hb_other_token_0123456789");
    assert.equal(again.ok, false);
    const found = researcherFromToken(db, verified.token, now);
    assert.equal(found?.id, verified.researcher.id);
    assert.equal(researcherFromToken(db, "hb_stolen", now), null);
  });

  it("locks a code after five misses and rate limits sends", () => {
    const db = emptyDb();
    issueLoginCode(db, "a@lab.edu", now, "111111");
    for (let i = 0; i < 5; i++) {
      const missed = verifyLoginCode(db, "a@lab.edu", "000000", now);
      assert.equal(missed.ok, false);
    }
    const late = verifyLoginCode(db, "a@lab.edu", "111111", now);
    assert.equal(late.ok, false);

    const limited = emptyDb();
    for (let i = 0; i < 5; i++) {
      const sent = issueLoginCode(limited, "a@lab.edu", now, `00000${i}`);
      assert.equal(sent.ok, true);
    }
    const blocked = issueLoginCode(limited, "a@lab.edu", now, "999999");
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.status, 429);
  });

  it("shows a researcher only their own studies", () => {
    const mine = study({ id: "stu_mine", ownerResearcherId: "res_a" });
    const theirs = study({ id: "stu_theirs", ownerResearcherId: "res_b" });
    const legacy = study({ id: "stu_old" });
    assert.equal(studyOwnedBy(mine, "res_a"), true);
    assert.equal(studyOwnedBy(theirs, "res_a"), false);
    assert.equal(studyOwnedBy(legacy, "res_a"), false);
    assert.equal(studyOwnedBy(null, "res_a"), false);

    const db = emptyDb();
    db.studies.push(mine, theirs, legacy);
    const claimed = claimUnownedStudies(db, "res_a", now);
    assert.equal(claimed, 1);
    assert.equal(db.studies.find((item) => item.id === "stu_old")?.ownerResearcherId, "res_a");
    assert.equal(db.studies.find((item) => item.id === "stu_theirs")?.ownerResearcherId, "res_b");
  });

  it("keeps participant catalog free of hypotheses and private studies", () => {
    const version = {
      id: "ver_1",
      studyId: "stu_1",
      versionNumber: 1,
      status: "published",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      spec: { hypotheses: ["비밀 가설"], researchQuestion: "비밀 질문" }
    } as StudyVersion;
    const card = openStudyCard(
      study({
        status: "published",
        listing: "public",
        publicDescription: "짧게 답하는 설문",
        estimatedMinutes: 5,
        ownerResearcherId: "res_a"
      }),
      version
    );
    assert.ok(card);
    assert.equal(JSON.stringify(card).includes("비밀"), false);
    assert.equal(JSON.stringify(card).includes("res_a"), false);
    assert.equal(card?.description, "짧게 답하는 설문");
    assert.equal(
      openStudyCard(study({ status: "published", listing: "private" }), version),
      null
    );
    assert.equal(openStudyCard(study({ status: "draft" }), version), null);
  });

  it("treats join as a participant action and refuses toss origins that are not our apps", () => {
    assert.equal(participantAction("join"), true);
    assert.equal(participantAction("runtime"), true);
    assert.equal(participantAction("get_bundle"), false);
    assert.equal(participantAction("data_overview"), false);
    assert.equal(originAllowed("https://haebomstudio.apps.tossmini.com", { NODE_ENV: "production" }), true);
    assert.equal(originAllowed("https://haebomstudio.private-apps.tossmini.com", { NODE_ENV: "production" }), true);
    assert.equal(originAllowed("https://haebomlab.apps.tossmini.com", { NODE_ENV: "production" }), false);
    assert.equal(originAllowed("https://evil.apps.tossmini.com", { NODE_ENV: "production" }), false);
    assert.equal(originAllowed("http://localhost:5174", { NODE_ENV: "production" }), false);
    assert.equal(originAllowed("http://localhost:5174", { NODE_ENV: "development" }), true);
    assert.equal(devEchoAllowed({ NODE_ENV: "production", HAEBOM_AUTH_DEV_ECHO: "1" }), false);
    assert.equal(devEchoAllowed({}), false);
    assert.equal(devEchoAllowed({ NODE_ENV: "development" }), true);
    assert.equal(legacyClaimEnabled({}), false);
    assert.equal(legacyClaimEnabled({ HAEBOM_ALLOW_LEGACY_CLAIM: "1" }), true);
    assert.equal(normalizeEmail("  Lab@School.kr "), "lab@school.kr");
    assert.equal(normalizeEmail("not-an-email"), null);
  });
});
