import { newId } from "../store";
import type { SourceCollection, SourceDocument, SourceLibrary } from "../types";
import { makeSourceDocument } from "./rag";

export const DEMO_COLLECTIONS: SourceCollection[] = [
  { id: "col_stress", name: "스트레스와 인지기능", color: "#4C7DFF" },
  { id: "col_mind", name: "마음챙김 중재 연구", color: "#2BB8A8" },
  { id: "col_youth", name: "청소년 정신건강", color: "#F5A524" },
  { id: "col_sleep", name: "수면과 학습", color: "#8B7CFF" },
  { id: "col_rec", name: "추천 설명과 신뢰", color: "#316BFF" },
  { id: "col_watch", name: "관심 논문", color: "#9AA6B2" }
];

function paper(
  partial: Parameters<typeof makeSourceDocument>[0] & { collectionId: string }
): SourceDocument {
  return makeSourceDocument({ literatureType: "journal", kind: "paper", ...partial });
}

/** Rich ResearchRabbit-style demo graph used by seed + 자료·계보 explorer */
export function seedDemoSourceLibrary(): SourceLibrary {
  const walker = paper({
    collectionId: "col_sleep",
    authors: "Walker, M.",
    year: 2017,
    title: "Sleep, memory, and next-day cognitive performance",
    venue: "Annual Review of Psychology",
    keywords: ["수면", "기억", "인지 수행"],
    citedByCount: 820,
    text: `수면은 기억 공고화와 다음 날 주의·수행에 영향을 준다.
학습 과제를 쓰는 실험에서 수면 부족은 인지 부하를 높인다.`
  });
  const park = paper({
    collectionId: "col_stress",
    authors: "Park, S.",
    year: 2018,
    title: "Academic stress and working memory in college students",
    venue: "Journal of Applied Psychology",
    keywords: ["학업 스트레스", "작업기억", "대학생"],
    citedByCount: 210,
    text: `학업 스트레스는 작업기억 용량을 일시적으로 떨어뜨릴 수 있다.
스트레스 처치는 인지 과제 수행을 교란 변수로 남긴다.`
  });
  const lee = paper({
    collectionId: "col_youth",
    authors: "Lee, J.",
    year: 2019,
    title: "Adolescent mental health screening in school settings",
    venue: "School Psychology Review",
    keywords: ["청소년", "정신건강", "선별"],
    literatureType: "conference",
    citedByCount: 64,
    text: `학교 장면 선별 도구는 청소년 정신건강 연구 표집에 자주 쓰인다.`
  });
  const kim = paper({
    collectionId: "col_mind",
    authors: "Kim, Y.",
    year: 2020,
    title: "Brief mindfulness training and attentional control",
    venue: "Mindfulness",
    keywords: ["마음챙김", "주의", "훈련"],
    citedByCount: 156,
    citesSourceIds: [walker.id, park.id],
    text: `짧은 마음챙김 훈련은 주의 통제를 개선할 수 있다.
설명 가능성과 절차 안내가 참여 지속을 돕는다.`
  });
  const choi = paper({
    collectionId: "col_stress",
    authors: "Choi, D.",
    year: 2021,
    title: "Perceived stress, rumination, and cognitive flexibility",
    venue: "Cognition & Emotion",
    keywords: ["스트레스", "반추", "인지 유연성"],
    citedByCount: 88,
    citesSourceIds: [park.id],
    text: `지각된 스트레스와 반추는 인지 유연성을 낮출 수 있다.`
  });
  const jang = paper({
    collectionId: "col_mind",
    authors: "Jang, H.",
    year: 2022,
    title: "The effects of mindfulness intervention on academic stress and cognitive performance in young adults",
    venue: "Journal of Behavioral Psychology, 45(3), 233-258",
    keywords: ["마음챙김", "학업 스트레스", "인지 수행", "대학생", "중재 연구"],
    citedByCount: 41,
    citesSourceIds: [kim.id, park.id, walker.id],
    text: `본 연구는 대학생을 대상으로 8주 마음챙김 중재가 학업 스트레스와 인지 수행에 미치는 영향을 검증하였다.
실험 결과 스트레스 점수는 감소하고 기억·주의 과제는 향상되었다.
중재 절차를 설명하면 참가자는 과제를 더 신뢰하는 경향이 있다.`
  });
  const yoon = paper({
    collectionId: "col_mind",
    authors: "Yoon, A.",
    year: 2023,
    title: "Replication of brief mindfulness effects on exam-related stress",
    venue: "Frontiers in Psychology",
    keywords: ["마음챙김", "시험 스트레스", "재현"],
    citedByCount: 12,
    citesSourceIds: [jang.id, kim.id],
    text: `Jang(2022) 프로토콜을 재현한 결과 시험 스트레스 감소가 부분 재현되었다.`
  });
  const oh = paper({
    collectionId: "col_youth",
    authors: "Oh, K.",
    year: 2024,
    title: "School-based mindfulness and adolescent help-seeking",
    venue: "Journal of Youth Studies",
    keywords: ["청소년", "마음챙김", "도움 요청"],
    citedByCount: 7,
    citesSourceIds: [jang.id, lee.id],
    text: `학교 기반 마음챙김은 청소년의 도움 요청 의향과 관련될 수 있다.`
  });

  const yeomans = paper({
    collectionId: "col_rec",
    authors: "Yeomans, Mullainathan, et al.",
    year: 2019,
    title: "추천 설명 가능성과 신뢰 (Yeomans et al., 예시 요약)",
    venue: "Demo corpus",
    keywords: ["추천", "설명", "신뢰"],
    citedByCount: 400,
    text: `추천 시스템에서 이유를 제시하면 사용자는 추천을 더 공정하고 유용하다고 평가하는 경향이 있다.
설명 가능성은 신뢰 형성의 핵심 단서가 될 수 있으나, 설명이 장황하거나 부정확하면 오히려 신뢰를 해칠 수 있다.
본 요약은 데모용 코퍼스이며 원문 대체가 아니다.`
  });
  const tone = paper({
    collectionId: "col_rec",
    authors: "Haebom Demo Notes",
    year: 2024,
    title: "커뮤니케이션 온화성과 수용 의도 (데모 노트)",
    kind: "note",
    literatureType: "review",
    keywords: ["온화", "수용", "어조"],
    citesSourceIds: [yeomans.id],
    text: `온화한 어조는 수용 의향과 관계 만족을 높일 수 있다.
중립적 어조는 전문성 지각과 연결되기도 한다.
어조 조작은 메시지 내용과 분리되어야 하며, 의도하지 않은 감정 표현이 섞이면 교란이 된다.`
  });
  const meta = paper({
    collectionId: "col_rec",
    authors: "Haebom Seed",
    year: 2025,
    title: "인간-AI 추천 신뢰 메타 메모",
    keywords: ["추천", "신뢰", "행동 측정"],
    citesSourceIds: [yeomans.id, tone.id],
    text: `행동 지표(클릭, 더 보기)와 설문 신뢰 문항을 동일 참가자 ID로 연결하면 조작 점검을 강화할 수 있다.
추천 이유 제시 여부는 조작 확인 문항으로 검증해야 한다.`
  });

  const documents = [walker, park, lee, kim, choi, jang, yoon, oh, yeomans, tone, meta];
  const edges: SourceLibrary["edges"] = [];
  for (const doc of documents) {
    for (const target of doc.citesSourceIds ?? []) {
      edges.push({
        id: newId("edge"),
        fromSourceId: doc.id,
        toSourceId: target,
        relation: "cites"
      });
    }
  }

  return {
    documents,
    edges,
    collections: DEMO_COLLECTIONS,
    groundingMode: "rag_corpus_only"
  };
}
