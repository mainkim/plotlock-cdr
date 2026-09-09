import type {
  BehaviorEventDef,
  Condition,
  Factor,
  FlowStep,
  Measure,
  Stimulus,
  StudyDraftSpec
} from "../types";

const DEMO_PROMPT_HINTS = [
  "추천 이유",
  "온화",
  "2x2",
  "between",
  "신뢰",
  "더 보기"
];

function looksLikeDemoPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const hits = DEMO_PROMPT_HINTS.filter((h) => lower.includes(h.toLowerCase()) || prompt.includes(h));
  return hits.length >= 2 || prompt.includes("추천");
}

function build2x2Demo(prompt: string): StudyDraftSpec {
  const factorA: Factor = {
    id: "factor_reason",
    name: "추천 이유 제공 여부",
    levels: [
      { id: "reason_none", label: "추천 이유 없음" },
      { id: "reason_present", label: "추천 이유 있음" }
    ]
  };
  const factorB: Factor = {
    id: "factor_tone",
    name: "표현의 온화성",
    levels: [
      { id: "tone_neutral", label: "중립적 표현" },
      { id: "tone_warm", label: "온화한 표현" }
    ]
  };

  const conditions: Condition[] = [
    {
      id: "cond_a1b1",
      label: "이유 없음 × 중립",
      factorLevels: { factor_reason: "reason_none", factor_tone: "tone_neutral" },
      stimulusId: "stim_a1b1"
    },
    {
      id: "cond_a2b1",
      label: "이유 있음 × 중립",
      factorLevels: { factor_reason: "reason_present", factor_tone: "tone_neutral" },
      stimulusId: "stim_a2b1"
    },
    {
      id: "cond_a1b2",
      label: "이유 없음 × 온화",
      factorLevels: { factor_reason: "reason_none", factor_tone: "tone_warm" },
      stimulusId: "stim_a1b2"
    },
    {
      id: "cond_a2b2",
      label: "이유 있음 × 온화",
      factorLevels: { factor_reason: "reason_present", factor_tone: "tone_warm" },
      stimulusId: "stim_a2b2"
    }
  ];

  const baseCriteria =
    "이 추천은 사용자의 최근 관심사, 유사 콘텐츠 소비 패턴, 그리고 커뮤니티 반응을 종합해 생성되었습니다.";

  // Intentional demo quirk: A1B2 has divergent CTA so Condition Compare can warn
  const stimuli: Stimulus[] = [
    {
      id: "stim_a1b1",
      conditionId: "cond_a1b1",
      title: "오늘의 콘텐츠 추천",
      body: "회원님께 이 콘텐츠를 추천합니다.",
      tone: "neutral",
      reasonShown: false,
      ctaLabel: "추천 확인하기",
      criteriaButtonLabel: "선정 기준 더 보기",
      criteriaDetail: baseCriteria
    },
    {
      id: "stim_a2b1",
      conditionId: "cond_a2b1",
      title: "오늘의 콘텐츠 추천",
      body: "회원님께 이 콘텐츠를 추천합니다.",
      tone: "neutral",
      reasonShown: true,
      reasonText: "최근 관심 키워드와 유사한 주제의 콘텐츠이기 때문입니다.",
      ctaLabel: "추천 확인하기",
      criteriaButtonLabel: "선정 기준 더 보기",
      criteriaDetail: baseCriteria
    },
    {
      id: "stim_a1b2",
      conditionId: "cond_a1b2",
      title: "오늘의 콘텐츠 추천",
      body: "회원님의 취향을 조금 더 세심하게 살펴보았어요. 이 콘텐츠를 추천드려요.",
      tone: "warm",
      reasonShown: false,
      ctaLabel: "지금 바로 살펴보기", // intentional unintended difference for QA demo
      criteriaButtonLabel: "선정 기준 더 보기",
      criteriaDetail: baseCriteria
    },
    {
      id: "stim_a2b2",
      conditionId: "cond_a2b2",
      title: "오늘의 콘텐츠 추천",
      body: "회원님의 취향을 조금 더 세심하게 살펴보았어요. 이 콘텐츠를 추천드려요.",
      tone: "warm",
      reasonShown: true,
      reasonText: "최근 관심 키워드와 잘 맞는 주제라서, 편안하게 살펴보시면 좋을 것 같아요.",
      ctaLabel: "추천 확인하기",
      criteriaButtonLabel: "선정 기준 더 보기",
      criteriaDetail: baseCriteria
    }
  ];

  const measures: Measure[] = [
    {
      id: "pre_q1",
      construct: "디지털 추천 이용 빈도",
      questionText: "평소 온라인 추천을 얼마나 자주 이용하시나요?",
      type: "likert",
      stage: "pre",
      scaleMin: 1,
      scaleMax: 7,
      scaleLabels: ["전혀 이용하지 않음", "매우 자주 이용함"],
      required: true
    },
    {
      id: "post_q1",
      construct: "추천 신뢰도",
      questionText: "방금 본 추천을 얼마나 신뢰하시나요?",
      type: "likert",
      stage: "post",
      scaleMin: 1,
      scaleMax: 7,
      scaleLabels: ["전혀 신뢰하지 않음", "매우 신뢰함"],
      required: true
    },
    {
      id: "post_q2",
      construct: "추천 수용의향",
      questionText: "이 추천을 실제로 따라볼 의향이 있으신가요?",
      type: "likert",
      stage: "post",
      scaleMin: 1,
      scaleMax: 7,
      scaleLabels: ["전혀 없음", "매우 높음"],
      required: true
    },
    {
      id: "att_q1",
      construct: "주의 확인",
      questionText: "이 문항은 주의 확인입니다. '3'을 선택해 주세요.",
      type: "attention_check",
      stage: "attention",
      scaleMin: 1,
      scaleMax: 7,
      required: true,
      correctAnswer: 3
    },
    {
      id: "manip_q1",
      construct: "조작 점검(이유 제시)",
      questionText: "추천에 대한 설명이 제시되었다고 느끼셨나요?",
      type: "manipulation_check",
      stage: "manipulation",
      options: ["예", "아니오", "잘 모르겠음"],
      required: true
    }
  ];

  // Deliberately omit stimulus_view duration event so Measurement Map shows "검토 필요"
  const behaviorEvents: BehaviorEventDef[] = [
    {
      id: "bev_criteria_click",
      name: "정보 탐색",
      eventType: "object_click",
      objectId: "criteria_button",
      description: "선정 기준 더 보기 클릭 여부",
      required: true
    },
    {
      id: "bev_stimulus_dwell",
      name: "자극 체류",
      eventType: "stimulus_impression",
      objectId: "stimulus_view",
      description: "자극 화면 체류시간 (duration)",
      required: true
    }
    // "추천 선택" intentionally missing → Measurement Map missing row
  ];

  const flow: FlowStep[] = [
    { id: "step_consent", type: "consent", title: "연구 참여 안내 및 동의" },
    {
      id: "step_pre",
      type: "survey",
      title: "사전 설문",
      stage: "pre",
      measureIds: ["pre_q1"]
    },
    { id: "step_stimulus", type: "stimulus", title: "추천 화면" },
    {
      id: "step_post",
      type: "survey",
      title: "사후 설문",
      stage: "post",
      measureIds: ["post_q1", "post_q2"]
    },
    {
      id: "step_attention",
      type: "survey",
      title: "확인 문항",
      stage: "attention",
      measureIds: ["att_q1"]
    },
    {
      id: "step_manip",
      type: "survey",
      title: "추가 확인",
      stage: "manipulation",
      measureIds: ["manip_q1"]
    },
    {
      id: "step_debrief",
      type: "debrief",
      title: "안내",
      body:
        "본 연구는 추천 설명 방식과 표현 톤이 신뢰에 미치는 영향을 살펴보기 위한 온라인 실험입니다. 참여해 주셔서 감사합니다."
    },
    { id: "step_complete", type: "complete", title: "참여 완료" }
  ];

  return {
    title: "추천 이유 × 표현 온화성이 추천 신뢰에 미치는 영향",
    researchQuestion:
      "추천 이유 제공 여부와 표현의 온화성은 추천 신뢰도 및 수용의향에 어떤 영향을 미치는가?",
    hypotheses: [
      "추천 이유가 제시되면 추천 신뢰도가 높아질 것이다.",
      "온화한 표현은 추천 수용의향을 높일 것이다.",
      "이유 제시와 온화한 표현의 조합에서 신뢰가 가장 높을 것이다."
    ],
    design: {
      type: "between_subject",
      factors: [factorA, factorB]
    },
    conditions,
    flow,
    stimuli,
    measures,
    behaviorEvents,
    reviewRequired: [
      {
        field: "targetN",
        reason: "표본 수는 연구자가 확정해야 합니다.",
        suggestedAction: "목표 참가자 수를 입력하세요. (데모 기본값 80)"
      },
      {
        field: "scaleSource",
        reason: "척도 출처/타당화 여부는 AI가 확정하지 않습니다.",
        suggestedAction: "리커트 문항이 자체 개발인지 validated scale인지 표시하세요."
      },
      {
        field: "irbStatus",
        reason: "IRB/연구윤리 상태는 연구자 책임입니다.",
        suggestedAction: "기관 심의 상태를 별도로 기록하세요."
      },
      {
        field: "exclusionCriteria",
        reason: "제외 기준이 입력되지 않았습니다.",
        suggestedAction: "필요 시 제외 기준을 review 메모에 추가하세요."
      },
      {
        field: "analysisPlan",
        reason: "통계 검정 방식은 AI가 보장하지 않습니다.",
        suggestedAction: "분석 계획(예: 2-way ANOVA)을 연구자 노트에 기록하세요."
      }
    ],
    aiMeta: {
      mode: "template",
      note:
        "AI는 초안만 생성합니다. 연구 타당성·IRB·논문 통과를 보장하지 않습니다. (데모: 구조화 템플릿 생성기)",
      sourcePrompt: prompt
    }
  };
}

function buildGenericDraft(prompt: string): StudyDraftSpec {
  const draft = build2x2Demo(prompt);
  draft.title = "연구 초안 (검토 필요)";
  draft.researchQuestion = prompt.slice(0, 200) || "연구 질문을 입력해 주세요.";
  draft.hypotheses = ["가설을 연구자가 확정해 주세요."];
  draft.reviewRequired.unshift({
    field: "designFit",
    reason: "입력에서 표준 2x2 데모 패턴을 충분히 인식하지 못했습니다.",
    suggestedAction: "조건을 직접 검토하고 수정하세요."
  });
  draft.aiMeta = {
    mode: "template",
    note: "일반 템플릿으로 생성되었습니다. AI는 임의로 표본수·척도 출처를 확정하지 않습니다.",
    sourcePrompt: prompt
  };
  return draft;
}

/**
 * AI Study Generator — structured JSON only.
 * Uses deterministic template for hackathon reliability.
 * Optional OPENAI_API_KEY can refine later; MVP never invents IRB/N/scales.
 */
export async function generateStudyDraft(prompt: string): Promise<StudyDraftSpec> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error("연구 설명을 입력해 주세요.");
  }

  // Prefer demo 2x2 when prompt matches representative scenario
  if (looksLikeDemoPrompt(trimmed)) {
    return build2x2Demo(trimmed);
  }

  // If LLM key present, still fall back to structured template (safe MVP)
  // and mark reviewRequired heavily rather than inventing claims.
  if (process.env.OPENAI_API_KEY) {
    const base = buildGenericDraft(trimmed);
    base.aiMeta = {
      mode: "llm",
      note: "LLM 키가 감지되었지만 MVP는 안전한 구조화 템플릿을 사용합니다. 타당성을 보장하지 않습니다.",
      sourcePrompt: trimmed
    };
    return base;
  }

  return buildGenericDraft(trimmed);
}

export function cloneSpecWithFreshIds(spec: StudyDraftSpec): StudyDraftSpec {
  // Keep stable IDs within a version for measurement mapping; only bump wrapper ids when needed
  return JSON.parse(JSON.stringify(spec)) as StudyDraftSpec;
}

export const DEMO_PROMPT = `추천 이유를 설명하는지와 말투가 온화한지가 추천 신뢰에 미치는 영향을 비교하고 싶어요.
2x2 between-subject 실험으로 만들고,
추천 기준 더 보기 버튼 클릭도 행동으로 기록해주세요.`;

export function ensureDemoMissingConstruct(spec: StudyDraftSpec): StudyDraftSpec {
  // Measurement map should surface "추천 선택 | 연결 없음 | 누락"
  return spec;
}
