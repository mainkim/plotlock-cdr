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

## 논문 → 실험 설계 툴킷 (라이너 스콜라 + 인접 도구)

해봄은 Qualtrics 대체 폼 빌더가 아니다. **논문을 읽고 조작(IV)·측정(DV)·자극을 실험 앱으로 바꾸는 제품**이다. 그록봇이 실험 설계를 손볼 때는 아래를 참고 기능으로 쓰고, 라이너 숫자를 해봄 실적으로 말하지 말 것. 라이너 API를 해봄에 몰래 붙이지 말 것(키 없음). 벤치마크는 OpenAlex / Semantic Scholar / 업로드 PDF / RAG 코퍼스.

공식: https://liner.com/ko/scholar · MCP: https://liner.com/mcp/scholar

### 라이너 스콜라가 하는 일 → 해봄에서 어디에 해당하나

| 라이너 기능 | 실험 설계에 쓰는 이유 | 해봄 현황 (2026-11-03) |
|---|---|---|
| 학술 검색 (4.8억편 규모 주장, 문장마다 출처) | 주제만 말해도 논문이 나옴. 키워드 여러 번 안 바꿈 | OpenAlex 키워드 검색 `search_literature`. 문장 단위 인용 UI는 없음 |
| 초록 미리보기 | 탭 수십 개 안 열고 선별 | 자료 탭 문서 카드·초록 필드. 호버 프리뷰는 약함 |
| 연도·인용수 필터 | 최근/고전/고인용만 | 계보 탐색기 연도·문헌유형 필터. 인용수 필터는 데이터만 있고 UI는 약함 |
| 조건으로 논문 추천 | “2×2, 신뢰도 척도 있는 RCT만” | 자연어 프롬프트 → OpenAlex 쿼리 변환 (`literatureQueryFromPrompt`) |
| 문헌 리뷰 에이전트 | 핵심 논문, 테마 클러스터, **연구 공백** | RAG 코퍼스 요약·자극 추천. 테마/갭 리포트 화면은 없음 |
| Research Tracer (인용 네트워크 맵) | 한 편에서 앞뒤 인용을 따라 조작을 훔침 | `expand_lineage` (OpenAlex + Semantic Scholar) + LineageExplorer. ResearchRabbit 느낌 |
| 논문 비교 표 (저자·키워드·초록, AI 열 추가) | 조건/척도/표본을 표로 맞춰 봐야 2×2가 나옴 | 조건 스튜디오는 자극 비교. **논문×조작×DV 매트릭스는 없음** |
| 가설 생성 / 가설 평가 | 막연한 아이디어 → 검증 가능한 H1, 신규성·실현가능성 | AI 2×2 초안. 가설 채점(명확성/신규성/실현가능성) UI 없음 |
| Survey Generator | 검증 척도 문항을 문헌에 묶어 생성 | Measurement Map + 설문 초안. 척도 원문 문항 라이브러리는 약함 |
| Survey Simulator | 가짜 응답으로 문항 구멍 미리 보기 | 없음. 참가자는 실제 `/p/{code}` |
| Citation Recommender + 스타일(APA 등) | 자극 출처·코드북 출처 표기 | DOI/OpenAlex id 저장. 참고문헌 자동 서식 없음 |
| Scholar Library (폴더, Zotero import, 전문 검색) | 연구 프로젝트별 코퍼스 | `SourceLibrary`에 문서 추가. 폴더/Zotero 없음 |
| MCP 툴 | 에이전트가 논문 본문에서 methods/results를 찾음 | 해봄 API: `search_literature`, `run_literature_copilot`, `expand_lineage`, `lineage` |

라이너 Scholar MCP 툴 이름 (그록봇이 라이너 MCP가 있으면 이걸 호출):

- 검색: `search_papers`, `search_paper_sections`(methods/experiments/results), `fetch_paper`, `get_paper_citations`
- 라이브러리: `scholar_library_tree`, `scholar_library_ls`, `scholar_library_search`, `scholar_library_read`, `scholar_library_upload` (추가만, 삭제 없음)

### 실험 설계할 때 그록봇이 논문에서 뽑아야 하는 것

1. **IV / 조작** — 논문 methods의 처치 문장, 자극 예시, 조작 점검(manipulation check)
2. **DV / 척도** — 설문 문항 원문, Likert 점수, 클릭 등 행동 이벤트 이름
3. **설계** — between/within, 2×2 팩터 이름, 랜덤화, 표본수 근거
4. **공백** — 라이너 Literature Review의 “gap”에 해당. 해봄 데모 기본 공백은 **추천 이유 제공 여부 × 표현의 온화성**
5. **자극 근거** — RAG: 코퍼스에 있는 문장만 자극으로 씀. 없는 내용은 거절
6. **계보** — 중심 논문 DOI → 인용/피인용 펼치기 → 같은 조작을 쓴 후속 연구

### 같이 쓰면 좋은 공개 도구 (라이너 대체·보완)

| 도구 | 쓰는 이유 | 해봄 연결 |
|---|---|---|
| **OpenAlex** | 키 없이 DOI·검색·referenced_works. polite pool `OPENALEX_MAILTO` | `lib/ai/openalex.ts` |
| **Semantic Scholar Graph API** | 인용 확장, 논문 추천 | `lib/ai/semantic-scholar.ts` |
| **Crossref / DOI.org** | DOI 정규화, 서지 | DOI 필드 |
| **ResearchRabbit / Connected Papers / Inciteful** | 계보 UX 레퍼런스 | LineageExplorer |
| **Elicit / Consensus** | 논문 표 비교, 효과 방향 | 비교 표는 미구현. UX 참고만 |
| **Zotero / Better BibTeX** | 연구실 라이브러리 | 미연동. 업로드 PDF/텍스트로 우회 |
| **OSF / AsPredicted** | 사전등록. 해봄은 타당성 보장 안 함 | 링크만, 주장 금지 |
| **PsychToolbox 척도 관례, IVs of COS** | 신뢰도·수용 의향 등 사회과학 척도 이름 | Measurement Map 필드명에 반영 |

해봄 코드 위치 (lineage-explorer 브랜치 기준): `lib/ai/openalex.ts`, `semantic-scholar.ts`, `expand-lineage.ts`, `research-copilot.ts`, `rag.ts`, `lineage.ts`, `components/LineageExplorer.tsx`

그록봇이 기능을 넣을 우선순위 (폼 빌더 금지, 논문→실험):

1. 논문 비교 표: 제목 / 연도 / 설계 / IV / DV / 표본 / 자극 한 줄
2. 연도·인용수 필터를 검색 결과에도
3. methods 섹션에서 조작·척도 추출 → 조건 카드·Measurement Map 자동 채움
4. 가설 초안 + “확인 필요(표본수·IRB)” 유지
5. 출처 문장 클릭 → 원문. 환각 논문 만들지 말 것

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

에이전트 규칙: `AGENTS.md`

원본 디자인 파일 (같은 브랜치, 공개 raw):

- 화면 정의: https://raw.githubusercontent.com/mainkim/plotlock-cdr/cursor/haebom-grokbot-brief-9120/docs/haebom-web-screen-design.md
- 클릭 프로토타입 TSX: https://raw.githubusercontent.com/mainkim/plotlock-cdr/cursor/haebom-grokbot-brief-9120/reference/click-prototype/page.tsx
- 클릭 프로토타입 CSS: https://raw.githubusercontent.com/mainkim/plotlock-cdr/cursor/haebom-grokbot-brief-9120/reference/click-prototype/globals.css
- 로고: `public/haebom-logo.png`, `public/haebom-symbol.png` (원페이저 원본 재가공 금지)

---

## 디자인 (목업 기준 — UI를 바꾸면 이걸 따를 것)

클릭 프로토타입 6화면: **홈 → AI 연구 브리프 → 조건·자극 → 측정 설계 → 검토·승인 → 모집·실행**

### 토큰

| 이름 | 값 | 용도 |
|---|---|---|
| navy | `#142338` | 사이드 대비, 승인 카드, 아바타 |
| ink | `#17212b` | 본문 |
| muted | `#6b7a90` | 보조 문구 |
| blue | `#316bff` | 해봄 블루. CTA, 활성 내비, 진행 바 |
| mint | `#2bc7a5` | 연구 안전, 완료 체크, AI 안전 모드 |
| line | `#e6ebf2` | 보더 |
| pale / page | `#f4f7fb` / `#f6f8fb` | 배경 |
| warn amber | `#b87900` / `#fff4da` | 확인 필요 |
| ok | `#16866f` | 연결됨·완료 |

폰트: `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif`  
그림자: `0 14px 40px rgba(24,48,88,.08)`  
CTA: 높이 43–44px, radius 11–13, 파란 버튼 `box-shadow: 0 8px 20px rgba(49,107,255,.22)`  
카드 radius 17–20. 필: blue `#eaf1ff/#2257d9`, mint `#e8faf5/#16866f`, gray `#f0f2f5/#667387`, amber `#fff4da/#b87900`

### 원칙

- 흰 바탕 · 해봄 블루 · 민트(안전)
- 토스처럼 넓은 여백, 짧은 문장, **한 화면 한 과업**
- 원페이저 로고를 다시 그리지 말고 이미지 자산 그대로
- **AI 초안**과 **연구자 승인**을 색·문구로 구분. 승인 전 게시 금지
- 데스크톱 사이드바 236px / 태블릿 78px / 모바일 하단 탭
- 참가자 화면에 condition/treatment 용어 넣지 말 것

### 화면별

1. **홈** — “어떤 연구를 앱으로 만들까요?” 계획서·선행연구·지도교수 피드백 업로드, 자연어 목적, 최근 연구 카드.
2. **AI 연구 브리프** — 연구질문·설계·결과변수·분석 후보. 원문/척도 연결. 표본수·IRB는 미확인으로 표시.
3. **조건·자극 스튜디오** — 4조건 한 화면 비교. 의도한 조작 외 언어·시각 차이 경고.
4. **측정 연결 지도** — 개념 ↔ 설문 ↔ 클릭 이벤트 ↔ 데이터 필드. 누락은 amber.
5. **검토·승인** — 출처·척도·혼입·표본수·IRB·개인정보 체크. 네이비 승인 카드. 승인 시 버전 고정.
6. **모집·실행** — 웹 링크·QR, 토스는 보조 채널. 익명 Participant ID. 균등 배정.

라이브 앱(`app/globals.css`, `components/AppShell.tsx`)은 이 목업 토큰을 이미 따라간다. 새 UI는 목업을 이기고 임의의 팔레트를 쓰지 말 것.

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
6. 논문 관련 실험 설계는 위 **라이너 스콜라 툴킷**을 기준으로 할 것. 라이너를 해봄이라고 부르지 말 것. OpenAlex/S2/RAG가 실제 백엔드다.

해인님 Mac에서 요금만 라이브에 올릴 때 (작업 클론이 plotlock-cdr일 것. `실험앱_vercel` 아님):

```bash
cd ~/plotlock-cdr
git fetch origin
git checkout cursor/lineage-explorer-9120
git pull
git push https://github.com/mainkim/haebom.git HEAD:main
```

이후 https://haebom-mauve.vercel.app/pricing 에 개인 구독 ₩49,000이 보여야 함.
