import { NextResponse } from "next/server";
import {
  applyDemoFixes,
  applyGroundedStimuli,
  addStudySource,
  approveStudy,
  createNewDraftFromPublished,
  createStudyFromPrompt,
  duplicateStudy,
  getDataOverview,
  getParticipantTimeline,
  getStudy,
  getStudyBundle,
  getStudyLineage,
  ingestEvents,
  joinStudy,
  linkStudySources,
  listStudies,
  previewGroundedStimuli,
  publishStudy,
  recordConsent,
  removeStudySource,
  seedDemoStudy,
  seedSourceLibrary,
  submitForReview,
  submitStep,
  updateDraftMeta,
  updateDraftSpec,
  updateStudyListing,
  getRuntime
} from "@/lib/study-service";
import { buildExports, buildXlsxBase64 } from "@/lib/export";
import { compareConditions, runQa } from "@/lib/qa";
import { DEMO_PROMPT } from "@/lib/ai/generator";
import { applyCors } from "@/lib/miniapp-cors";
import {
  claimUnownedStudies,
  legacyClaimEnabled,
  participantAction,
  readResearcher,
  studyOwnedBy,
  withResearcherDb
} from "@/lib/researcher-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(req: Request, body: unknown, status = 200) {
  const res = NextResponse.json(body, { status });
  applyCors(req, res.headers, "GET, POST, OPTIONS");
  return res;
}

export function OPTIONS(req: Request) {
  const res = new NextResponse(null, { status: 204 });
  applyCors(req, res.headers, "GET, POST, OPTIONS");
  return res;
}

function ownedOrNull(researcherId: string, studyId: unknown) {
  if (typeof studyId !== "string" || !studyId) return null;
  const study = getStudy(studyId);
  if (!studyOwnedBy(study, researcherId)) return null;
  return study;
}

export async function GET(req: Request) {
  const researcher = readResearcher(req.headers);
  if (!researcher) return json(req, { error: "인증이 필요합니다." }, 401);
  const studies = listStudies()
    .filter((s) => s.ownerResearcherId === researcher.id)
    .map((s) => {
    const bundle = getStudyBundle(s.id);
    const overview = getDataOverview(s.id);
    return {
      ...s,
      designLabel:
        bundle?.draft?.spec.design.factors.map((f) => f.levels.length).join("x") ??
        bundle?.current?.spec.design.factors.map((f) => f.levels.length).join("x") ??
        "",
      completedN: overview?.overview.totalCompleted ?? 0,
      assignedN: overview?.overview.totalAssigned ?? 0
    };
  });
  return json(req, { studies, demoPrompt: DEMO_PROMPT, demoMode: true });
}

export async function POST(req: Request) {
  let body: any;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json(req, { error: "잘못된 요청입니다." }, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json(req, { error: "잘못된 요청입니다." }, 400);
  }
  const action = typeof body.action === "string" ? body.action : "";

  let researcherId: string | null = null;
  if (!participantAction(action)) {
    const researcher = readResearcher(req.headers);
    if (!researcher) return json(req, { error: "인증이 필요합니다." }, 401);
    researcherId = researcher.id;
    if (typeof body.studyId === "string" && !ownedOrNull(researcher.id, body.studyId)) {
      return json(req, { error: "Not found" }, 404);
    }
    if (action === "timeline") {
      const participantId = typeof body.participantId === "string" ? body.participantId : "";
      const timeline = participantId ? getParticipantTimeline(participantId) : null;
      const study = timeline ? getStudy(timeline.participant.studyId) : null;
      if (!studyOwnedBy(study, researcher.id)) return json(req, { error: "Not found" }, 404);
    }
  }

  try {
    switch (action) {
      case "create_from_prompt": {
        const result = await createStudyFromPrompt(String(body.prompt ?? ""), {
          title: typeof body.title === "string" ? body.title : undefined,
          targetN: typeof body.targetN === "number" ? body.targetN : undefined,
          isDemo: body.isDemo === true,
          ownerResearcherId: researcherId ?? undefined
        });
        return json(req, result);
      }
      case "seed_demo": {
        const result = await seedDemoStudy({ ownerResearcherId: researcherId ?? undefined });
        return json(req, result);
      }
      case "claim_legacy": {
        if (!legacyClaimEnabled() || !researcherId) {
          return json(req, { error: "Not found" }, 404);
        }
        const claimed = withResearcherDb((db) => claimUnownedStudies(db, researcherId!));
        return json(req, { claimed });
      }
      case "update_draft_meta": {
        return json(req, updateDraftMeta(String(body.studyId), {
          title: typeof body.title === "string" ? body.title : undefined,
          researchQuestion: typeof body.researchQuestion === "string" ? body.researchQuestion : undefined,
          hypotheses: Array.isArray(body.hypotheses)
            ? (body.hypotheses as unknown[]).filter((item): item is string => typeof item === "string")
            : undefined
        }));
      }
      case "update_listing": {
        const listing = body.listing === "public" || body.listing === "private" ? body.listing : undefined;
        if (body.listing !== undefined && listing === undefined) {
          return json(req, { error: "listing must be public or private" }, 400);
        }
        const minutes =
          body.estimatedMinutes === null || body.estimatedMinutes === ""
            ? null
            : body.estimatedMinutes === undefined
              ? undefined
              : Number(body.estimatedMinutes);
        return json(req, updateStudyListing(String(body.studyId), {
          listing,
          publicDescription: typeof body.publicDescription === "string" ? body.publicDescription : undefined,
          estimatedMinutes: minutes
        }));
      }
      case "get_bundle": {
        const bundle = getStudyBundle(body.studyId);
        if (!bundle) return json(req, { error: "Not found" }, 404);
        const diffs = compareConditions(bundle.draft?.spec ?? bundle.current!.spec);
        const qa = runQa(bundle.draft?.spec ?? bundle.current!.spec, {
          publishedLocked: bundle.draft?.status === "published"
        });
        return json(req, { ...bundle, diffs, qa });
      }
      case "update_stimulus": {
        const result = updateDraftSpec(body.studyId, (spec) => {
          const stim = spec.stimuli.find((s) => s.id === body.stimulusId);
          if (!stim) throw new Error("Stimulus not found");
          Object.assign(stim, body.patch);
          return spec;
        });
        return json(req, result);
      }
      case "update_measure": {
        const result = updateDraftSpec(body.studyId, (spec) => {
          const m = spec.measures.find((x) => x.id === body.measureId);
          if (!m) throw new Error("Measure not found");
          Object.assign(m, body.patch);
          return spec;
        });
        return json(req, result);
      }
      case "apply_demo_fixes": {
        return json(req, applyDemoFixes(body.studyId));
      }
      case "submit_review": {
        return json(req, submitForReview(body.studyId));
      }
      case "approve": {
        return json(req, approveStudy(body.studyId, { forceClearBlockers: body.forceClearBlockers }));
      }
      case "publish": {
        return json(req, publishStudy(body.studyId));
      }
      case "new_draft": {
        return json(req, createNewDraftFromPublished(body.studyId));
      }
      case "join": {
        return json(req, joinStudy(body.joinCode, body.channel ?? "web"));
      }
      case "runtime": {
        const runtime = getRuntime(body.participantId);
        if (!runtime) return json(req, { error: "Not found" }, 404);
        return json(req, runtime);
      }
      case "consent": {
        return json(req, recordConsent(body.participantId));
      }
      case "submit_step": {
        return json(req, 
          submitStep({
            participantId: body.participantId,
            stepId: body.stepId,
            responses: body.responses,
            criteriaOpened: body.criteriaOpened,
            recommendationSelected: body.recommendationSelected,
            stimulusDurationMs: body.stimulusDurationMs
          })
        );
      }
      case "events": {
        return json(req, ingestEvents(body.events ?? []));
      }
      case "data_overview": {
        const data = getDataOverview(body.studyId);
        if (!data) return json(req, { error: "Not found" }, 404);
        const participants = data.participants.map((participant) => ({
          id: participant.id,
          sessionId: participant.sessionId,
          createdAt: participant.createdAt
        }));
        return json(req, { ...data, participants });
      }
      case "timeline": {
        const data = getParticipantTimeline(body.participantId);
        if (!data) return json(req, { error: "Not found" }, 404);
        const { externalAuthRef: _hidden, ...participant } = data.participant;
        return json(req, { ...data, participant });
      }
      case "export": {
        const files = buildExports(body.studyId);
        return json(req, files);
      }
      case "export_xlsx": {
        const xlsx = buildXlsxBase64(body.studyId);
        return json(req, xlsx);
      }
      case "duplicate": {
        return json(req, duplicateStudy(body.studyId));
      }
      case "add_source": {
        return json(req, 
          addStudySource(body.studyId, {
            title: body.title,
            text: body.text,
            authors: body.authors,
            year: body.year,
            kind: body.kind,
            citesSourceIds: body.citesSourceIds
          })
        );
      }
      case "remove_source": {
        return json(req, removeStudySource(body.studyId, body.sourceId));
      }
      case "link_sources": {
        return json(req, 
          linkStudySources(body.studyId, body.fromSourceId, body.toSourceId, body.note)
        );
      }
      case "lineage": {
        const data = getStudyLineage(body.studyId);
        if (!data) return json(req, { error: "Not found" }, 404);
        return json(req, data);
      }
      case "preview_grounded_stimuli": {
        return json(req, previewGroundedStimuli(body.studyId, body.query));
      }
      case "apply_grounded_stimuli": {
        return json(req, applyGroundedStimuli(body.studyId, body.query));
      }
      case "seed_source_library": {
        return json(req, seedSourceLibrary(body.studyId));
      }
      default:
        return json(req, { error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json(req, { error: message }, 400);
  }
}
