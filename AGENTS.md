# AGENTS.md — 해봄 (Haebom)

## Product

No-code social science research platform: hypothesis → AI draft → condition QA → versioned publish → server-side randomization → linked survey+behavior events → export.

## Non-negotiables

- Do not claim AI guarantees validity/IRB/publication
- No condition leakage to participants
- No direct edits to published versions
- No raw data deletion
- Keep PII separate from research joins
- Prefer E2E working demo over new feature proposals

## Commands

```bash
npm install
npm run demo:reset
npm run dev
npm test
npm run e2e:smoke
```

## Demo scenario

2×2: 추천 이유 제공 여부 × 표현의 온화성

## Legacy

`legacy/plotlock/` is the previous unrelated hackathon demo — do not delete unprompted.

## Agent skills

Project skills live in `.cursor/skills/` (committed):

| Source | Prefix / name | Use for |
|--------|---------------|---------|
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | e.g. `test-driven-development`, `spec-driven-development` | Specs → code → review → test |
| [obra/superpowers](https://github.com/obra/superpowers) | `superpowers-*` | Brainstorm, plans, TDD, debugging, finish branch |
| [browser-harness](https://github.com/browser-use/browser-harness) | `browser-harness` | Real Chrome control via CDP |

Routing rule: `.cursor/rules/agent-skills.mdc`

Browser Harness CLI (local/dev machine):

```bash
uv tool install --python 3.12 --upgrade --force browser-harness
# then enable Chrome remote debugging (chrome://inspect/#remote-debugging)
```

