# 해봄 (Haebom)

**가설에서 데이터까지, 코딩 없이.**

사회과학 연구자의 가설을 AI로 실제 온라인 실험으로 만들고, 설문과 행동 데이터를 하나의 Participant ID로 연결하는 노코드 연구 플랫폼입니다.

Founder: **김해인**

> DEMO / MOCK DATA — AI는 연구 타당성·IRB·논문 통과를 보장하지 않습니다.

---

## 60초 데모 플로우

1. `/studies/new` — 한국어로 연구 아이디어 입력
2. AI가 2×2 between-subject 초안 생성
3. 4조건 비교 + Measurement Map QA (누락 행동 측정 warning)
4. 수정 → Review → Approve → Publish
5. `/p/{joinCode}` 참가: 자극 · 버튼 클릭 · 설문
6. `/studies/{id}/data` — 동일 Participant ID에 click + survey 연결 확인
7. `participant_wide.csv` / `event_long.csv` / `codebook.csv` export

```bash
npm install
npm run demo:reset
npm run dev
```

Open `http://localhost:3000`

---

## 핵심 원칙

- Qualtrics/Typeform 대체 폼 빌더가 **아님**
- 서버 사이드 equal randomization (client `Math.random`만으로 끝내지 않음)
- Published study version 직접 수정 금지 → 새 draft version
- Participant에게 condition/treatment/randomization 용어 비노출
- 배정된 condition의 stimulus만 서버에서 전달
- PII와 research data 분리 (email/name으로 join 금지)
- Raw data 삭제 금지 → Quality Flag → Review → Inclusion

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm test` | Unit tests |
| `npm run e2e:smoke` | Headless create→publish→join→export |
| `npm run seed:demo` | Seed published demo study |
| `npm run demo:reset` | Wipe DB + reseed demo |

---

## Stack

- Next.js App Router + TypeScript
- File-backed JSON store with lock (`data/haebom.json`) for hackathon reliability
- Deterministic AI study generator (structured JSON; optional `OPENAI_API_KEY` noted but not required)

---

## Legacy

이전 PlotLock CDR 데모는 `legacy/plotlock/`에 보존되어 있습니다.

---

## 수익모델 가설

무료 Preview → 연구 프로젝트 단위 유료 → 연구실 구독. 참가자 보상비는 SaaS 매출과 분리. **현재 매출을 주장하지 않습니다.**
