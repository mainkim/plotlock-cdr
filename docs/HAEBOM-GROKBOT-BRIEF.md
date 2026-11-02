# 해봄 (Haebom) — Grokbot 인수 브리프

다른 에이전트(그록봇)가 이 파일만 읽고 해봄 작업을 이어갈 수 있게 정리한 문서입니다.  
최종 확인: 2026-11-03 (Asia/Seoul).

---

## 한 줄

해봄은 사회과학 연구자가 **가설을 코딩 없이 온라인 실험으로 만들고**, 설문과 행동 데이터를 같은 참가자 ID로 묶는 노코드 연구 플랫폼입니다. 창업자 **김해인**. Cursor로 MVP·문헌 코파일럿·논문 계보 탐색기까지 만들었고, 공개 데모는 **https://haebom-mauve.vercel.app** 입니다.

---

## 이 제품이 아닌 것

- Qualtrics/Typeform 대체 폼 빌더가 아님
- AI가 타당성·IRB·논문 게재를 **보장한다고 말하면 안 됨**
- 지금 매출이 난 상태가 아님. 요금은 **예시 + 목업 결제**
- `legacy/plotlock/` 은 이전 해커톤 데모. 해봄과 무관. 요청 없이 삭제하지 말 것

---

## 절대 깨면 안 되는 원칙

- 참가자에게 condition / treatment / randomization 용어 비노출
- 배정된 조건의 자극만 서버에서 전달 (condition leakage 금지)
- 게시된 버전은 직접 수정 금지 → 새 draft version
- raw data 삭제 금지 → Quality Flag → Review → Inclusion
- PII와 연구 데이터 분리 (이메일/이름으로 join 금지)
- 서버 사이드 equal randomization (클라이언트 `Math.random`만으로 끝내지 않음)
- 새 기능 제안보다 **돌아가는 E2E 데모**를 우선

데모 시나리오: **2×2 — 추천 이유 제공 여부 × 표현의 온화성**

---

## 지금 보여줄 주소

| 용도 | URL | 메모 |
|---|---|---|
| **공식 라이브 (이걸 쓸 것)** | https://haebom-mauve.vercel.app | Vercel 프로젝트 `haebom` ← `github.com/mainkim/haebom` `main` |
| 60초 시드 | https://haebom-mauve.vercel.app/demo | 데모 연구 시드 후 자료·계보 탭 |
| 요금 (라이브) | https://haebom-mauve.vercel.app/pricing | **구 카피** 아래 참고 |
| 해봄으로 만든 예시 앱 | https://exercise-demo-xi.vercel.app | 운동 계획 도우미. 해봄 산출물 예시 |
| **쓰지 말 것** | https://haebomresearch.vercel.app | 옛 배포. 문헌 검색 등 최신 기능 없음 |

---

## 저장소 두 개

| 저장소 | 역할 | 공개 |
|---|---|---|
| https://github.com/mainkim/plotlock-cdr | Cursor 클라우드 에이전트가 코드를 쓰는 작업 저장소 | public |
| https://github.com/mainkim/haebom | 라이브(Vercel `haebom` / mauve)가 붙는 제품 저장소 | public |

- Cursor 봇(`cursor[bot]`)은 **plotlock-cdr만 push 가능**. `haebom`은 **403**.
- 라이브 반영은 해인님이 Mac에서 `haebom` `main`으로 푸시해야 함.
- `haebom` `main` 마지막 확인 SHA: `6903113` (계보 탐색기까지, **새 구독 요금 커밋 없음**).
- plotlock-cdr `main`: `833b36f` RAG 자극 추천·계보.
- 가장 앞선 작업 브랜치: `cursor/lineage-explorer-9120` @ `4f1b03b` (구독 요금 카피 포함).

관련 PR (plotlock-cdr):

- #2 해봄 Trainthon MVP — merged
- #3 Vercel DB lock `/tmp` — merged
- #4 목업 UI (홈·조건·승인·모집) — merged
- #5 agent-skills — merged
- #6 OpenAlex/S2 DOI 계보 확장 — draft
- #7 OpenAlex + RAG 코파일럿 — draft
- #8 paper lineage explorer — draft (`4f1b03b` 요금 카피까지 이 브랜치)

---

## 라이브에 있는 것 / 없는 것

**mauve에 있음 (2026-11-03 확인)**

- 해봄 연구자 UI, 연구 생성 → 조건 QA → 승인 → Publish
- 참가자 런타임 `/p/{joinCode}`
- 대시보드: 같은 Participant ID로 클릭+설문, CSV/codebook/XLSX
- 문헌 검색·코파일럿, 논문 계보 탐색기
- exercise-demo 예시

**mauve에 없음**

- 새 구독 요금 카피. 라이브 `/pricing`은 여전히 **체험판 / 연구 프로젝트 ₩89,000 / 연구실 구독 ₩290,000**, 카피 “무료 Preview → 연구 프로젝트 단위 유료”.
- 작업본(`4f1b03b`)은 **14일 체험 / 개인 구독 ₩49,000·연 ₩490,000 / 연구실 구독 ₩290,000·연 ₩2,900,000**. 참가자 리워드는 구독과 별개. 결제는 localStorage 목업.

---

## Cursor로 만든 것 (기능)

1. **MVP** — 한국어 아이디어 → AI 2×2 초안 → 4조건 비교 → Measurement Map QA → Review/Approve/Publish → 참가 → 데이터 연결·export
2. **배포가 실제로 돌게** — Vercel에서 JSON store 잠금 오류 → `/tmp` writable store
3. **문헌 + 코파일럿** — OpenAlex, Semantic Scholar. 연구 생성 시 문헌 검색 → RAG 자극 추천. 설계 탭에 tool trace. API: `search_literature`, `run_literature_copilot`, `expand_lineage`
4. **계보 탐색기** — ResearchRabbit 스타일 그래프. Jang 2022 데모, 연도/유형 필터, 노드 라벨 레이아웃
5. **요금 카피 재정리** — 프로젝트 건당 과금이 아니라 **유료 구독**. 작업 브랜치에만 있음

발표용 한 문장: Cursor로 **문헌 검색 → 계보 → AI 실험 초안 → 돌아가는 연구자/참가자 화면**까지 이었고, 연구 설계의 앞단을 제품이 대신한다.

---

## 스택 · 로컬

- Next.js App Router + TypeScript, lucide-react
- 파일 JSON store `data/haebom.json` (해커톤 안정성). Vercel은 `/tmp`
- AI 초안은 구조화 JSON. `OPENAI_API_KEY` 있으면 쓰지만 필수는 아님. e2e는 `HAEBOM_SKIP_LITERATURE=1` 가능

```bash
npm install
npm run demo:reset
npm run dev          # 0.0.0.0:3000
npm test
npm run e2e:smoke
```

화면 설계: `docs/haebom-web-screen-design.md`, `reference/click-prototype/`  
에이전트 규칙: `AGENTS.md`

---

## 해인님이 직접 한 일

- PlotLock 저장소·해봄 방향·목업·Trainthon 맥락을 정함
- 공개 저장소 `mainkim/haebom` 생성, Mac에서 계보 탐색기까지 `main` 푸시 (그래서 mauve에 계보가 있음)
- Vercel `haebom` 프로젝트 연결
- 역할: Marketer. 코드로 직접 디버그·이터레이션하는 걸 선호

---

## 그록봇이 이어서 할 때

1. 라이브 링크는 **mauve만** 쓸 것. `haebomresearch.vercel.app` 금지.
2. 구독 요금(₩49,000)을 라이브에 올리려면 `cursor/lineage-explorer-9120`의 요금 커밋을 `mainkim/haebom` `main`에 푸시해야 함. **이 에이전트 토큰으로는 불가(403).** 해인님 푸시 또는 `haebom`에 cursor[bot] Write collaborator.
3. 결제/매출/IRB/타당성을 사실인 것처럼 쓰지 말 것.
4. 새 기능보다 데모가 깨지지 않게 유지하는 쪽이 우선.
5. plotlock-cdr에 작업하고, 라이브는 haebom 푸시 없이는 안 바뀜.

해인님 Mac에서 요금만 라이브에 올릴 때 (작업 클론이 plotlock-cdr일 것. `실험앱_vercel` 아님):

```bash
cd ~/plotlock-cdr
git fetch origin
git checkout cursor/lineage-explorer-9120
git pull
git push https://github.com/mainkim/haebom.git HEAD:main
```

이후 https://haebom-mauve.vercel.app/pricing 에 개인 구독 ₩49,000이 보여야 함.
