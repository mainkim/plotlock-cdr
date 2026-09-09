# 해봄 해커톤 시연 플로우

## Live demo

- Production: https://haebom-research.vercel.app
- 60초 시드: https://haebom-research.vercel.app/demo
- 요금 목업: https://haebom-research.vercel.app/pricing
- GitHub: https://github.com/mainkim/plotlock-cdr (`main`)

## Research

1. `/` 또는 `/studies/new` — 연구 아이디어 자연어 입력
2. AI가 2×2 실험 초안 생성
3. `/studies/{id}?tab=conditions` — 조건 비교
4. `?tab=qa` — 설문/행동 측정 연결 · QA
5. `?tab=publish` — 연구자 승인 → Publish → 참여 링크

빠른 경로: `/demo` → **데모 연구 Publish 시드**

## Participant Web Runtime

`/p/{joinCode}`

참여 안내/동의 → (서버 랜덤 배정) → 자극 → 행동과제(클릭) → 사후 설문 → 완료

- condition / treatment / randomization 용어 비노출
- 배정된 stimulus만 전달
- refresh 시 동일 participant 유지 (sessionStorage)

## Research Dashboard

`/studies/{id}/data`

- 조건별 모집 현황
- Participant Timeline
- 클릭 + 설문 응답 동일 Participant ID 연결
- CSV / Codebook / XLSX Export

## Commands

```bash
npm install
npm run demo:reset
npm run dev
npm run e2e:smoke
```
