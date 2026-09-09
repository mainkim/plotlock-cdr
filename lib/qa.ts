import type {
  ConditionDiffWarning,
  MeasurementMapRow,
  QaIssue,
  QaReport,
  StudyDraftSpec,
  StudyVersion
} from "./types";
import { newId, nowIso } from "./store";

export function runQa(spec: StudyDraftSpec, opts?: { publishedLocked?: boolean }): QaReport {
  const blockers: QaIssue[] = [];
  const warnings: QaIssue[] = [];
  const aiSuggestions: QaIssue[] = [];

  const factorCount = spec.design.factors.length;
  const expectedConditions =
    factorCount === 2
      ? spec.design.factors[0].levels.length * spec.design.factors[1].levels.length
      : spec.conditions.length;

  if (spec.design.type === "between_subject" && factorCount === 2 && spec.conditions.length !== expectedConditions) {
    blockers.push({
      id: newId("qa"),
      severity: "blocker",
      source: "rule",
      code: "CONDITION_COUNT_MISMATCH",
      message: `2x2 설계인데 조건이 ${spec.conditions.length}개입니다. ${expectedConditions}개가 필요합니다.`
    });
  }

  for (const cond of spec.conditions) {
    const stim = spec.stimuli.find((s) => s.id === cond.stimulusId || s.conditionId === cond.id);
    if (!stim) {
      blockers.push({
        id: newId("qa"),
        severity: "blocker",
        source: "rule",
        code: "MISSING_STIMULUS",
        message: `조건 "${cond.label}"에 자극이 없습니다.`,
        relatedIds: [cond.id]
      });
    }
  }

  const dvConstructs = ["추천 신뢰도", "추천 수용의향"];
  for (const construct of dvConstructs) {
    const linked = spec.measures.find((m) => m.construct === construct);
    if (!linked) {
      blockers.push({
        id: newId("qa"),
        severity: "blocker",
        source: "rule",
        code: "DV_UNLINKED",
        message: `종속변수 "${construct}"에 연결된 문항이 없습니다.`,
        relatedIds: []
      });
    }
  }

  for (const bev of spec.behaviorEvents.filter((b) => b.required)) {
    // Required behavior events must exist in definitions; dwell tracking needs duration capture note
    if (bev.objectId === "stimulus_view") {
      warnings.push({
        id: newId("qa"),
        severity: "warning",
        source: "rule",
        code: "DWELL_REVIEW",
        message: "자극 체류시간 측정이 정의되어 있습니다. 런타임 duration 수집을 확인하세요.",
        relatedIds: [bev.id]
      });
    }
  }

  // Missing intended construct: 추천 선택
  const hasChoice = spec.behaviorEvents.some((b) => b.name.includes("선택") || b.objectId === "recommendation_select");
  if (!hasChoice) {
    blockers.push({
      id: newId("qa"),
      severity: "blocker",
      source: "rule",
      code: "BEHAVIOR_MISSING",
      message: "행동 측정 '추천 선택'에 연결된 이벤트가 없습니다.",
      relatedIds: []
    });
  }

  const objectIds = new Set<string>();
  for (const stim of spec.stimuli) {
    const key = `${stim.conditionId}:${stim.id}`;
    if (objectIds.has(key)) {
      blockers.push({
        id: newId("qa"),
        severity: "blocker",
        source: "rule",
        code: "DUPLICATE_OBJECT",
        message: `조건 내 object id 중복: ${stim.id}`,
        relatedIds: [stim.id]
      });
    }
    objectIds.add(key);
  }

  if (opts?.publishedLocked) {
    blockers.push({
      id: newId("qa"),
      severity: "blocker",
      source: "rule",
      code: "PUBLISHED_IMMUTABLE",
      message: "Published study는 직접 수정할 수 없습니다. 새 draft version을 만드세요."
    });
  }

  for (const item of spec.reviewRequired) {
    warnings.push({
      id: newId("qa"),
      severity: "warning",
      source: "rule",
      code: "REVIEW_REQUIRED_FIELD",
      message: `${item.field}: ${item.reason}`
    });
  }

  // AI suggestions — never claim statistical validity
  aiSuggestions.push({
    id: newId("qa"),
    severity: "info",
    source: "ai_suggestion",
    code: "AI_REVIEW",
    message:
      "조건 간 CTA 문구가 다를 수 있습니다. 의도하지 않은 차이일 수 있으니 검토하세요. (통계적 타당성을 보장하지 않습니다.)"
  });

  const measurementMap = buildMeasurementMap(spec);
  const canApprove = blockers.length === 0;

  // Soften: demo QA should allow approve after researcher acknowledges missing optional construct
  // Keep blocker for missing 추천 선택 but allow override via resolveMissingBehavior
  return {
    generatedAt: nowIso(),
    blockers,
    warnings,
    aiSuggestions,
    measurementMap,
    canApprove
  };
}

export function buildMeasurementMap(spec: StudyDraftSpec): MeasurementMapRow[] {
  const rows: MeasurementMapRow[] = [];

  for (const m of spec.measures.filter((x) => x.stage === "post" || x.construct.includes("신뢰") || x.construct.includes("수용"))) {
    if (m.stage === "post") {
      rows.push({
        construct: m.construct,
        measurementMethod: `${m.id} ${m.type === "likert" ? "Likert" : m.type}`,
        status: "linked",
        measureId: m.id
      });
    }
  }

  const criteria = spec.behaviorEvents.find((b) => b.objectId === "criteria_button");
  rows.push({
    construct: "정보 탐색",
    measurementMethod: criteria ? "criteria_button_click" : "연결 없음",
    status: criteria ? "linked" : "missing",
    behaviorEventId: criteria?.id
  });

  const dwell = spec.behaviorEvents.find((b) => b.objectId === "stimulus_view");
  rows.push({
    construct: "자극 체류",
    measurementMethod: dwell ? "stimulus_view duration" : "연결 없음",
    status: dwell ? "review_needed" : "missing",
    behaviorEventId: dwell?.id
  });

  const choice = spec.behaviorEvents.find((b) => b.objectId === "recommendation_select");
  rows.push({
    construct: "추천 선택",
    measurementMethod: choice ? "recommendation_select click" : "연결 없음",
    status: choice ? "linked" : "missing",
    behaviorEventId: choice?.id
  });

  return rows;
}

/** Detect unintended between-condition differences (not declared as factor manipulations). */
export function compareConditions(spec: StudyDraftSpec): ConditionDiffWarning[] {
  const warnings: ConditionDiffWarning[] = [];
  if (spec.stimuli.length < 2) return warnings;

  const fields: Array<keyof (typeof spec.stimuli)[0]> = [
    "title",
    "ctaLabel",
    "criteriaButtonLabel",
    "criteriaDetail"
  ];

  // Fields that SHOULD vary by factor
  // reasonShown -> factor_reason, body/tone/reasonText -> factor_tone

  for (const field of fields) {
    const values = new Map<string, string[]>();
    for (const stim of spec.stimuli) {
      const val = String(stim[field] ?? "");
      const list = values.get(val) ?? [];
      list.push(stim.conditionId);
      values.set(val, list);
    }
    if (values.size > 1) {
      // CTA etc. should be identical across conditions unless intentionally manipulated
      const shouldBeConstant = field === "ctaLabel" || field === "title" || field === "criteriaButtonLabel" || field === "criteriaDetail";
      if (shouldBeConstant) {
        warnings.push({
          field: String(field),
          message: `의도하지 않은 차이일 수 있습니다. 검토하세요. (필드: ${String(field)})`,
          conditionIds: spec.stimuli.map((s) => s.conditionId)
        });
      }
    }
  }

  return warnings;
}

export function canTransition(from: StudyVersion["status"], to: StudyVersion["status"]): boolean {
  const order: StudyVersion["status"][] = ["draft", "review", "approved", "published"];
  const fi = order.indexOf(from);
  const ti = order.indexOf(to);
  return ti === fi + 1;
}

/** Fix demo blocker: add missing recommendation_select behavior event */
export function addMissingRecommendationSelect(spec: StudyDraftSpec): StudyDraftSpec {
  const next = JSON.parse(JSON.stringify(spec)) as StudyDraftSpec;
  if (!next.behaviorEvents.some((b) => b.objectId === "recommendation_select")) {
    next.behaviorEvents.push({
      id: "bev_reco_select",
      name: "추천 선택",
      eventType: "object_click",
      objectId: "recommendation_select",
      description: "추천 확인/선택 버튼 클릭",
      required: true
    });
  }
  return next;
}

export function harmonizeCtaLabels(spec: StudyDraftSpec, cta = "추천 확인하기"): StudyDraftSpec {
  const next = JSON.parse(JSON.stringify(spec)) as StudyDraftSpec;
  for (const stim of next.stimuli) {
    stim.ctaLabel = cta;
  }
  return next;
}
