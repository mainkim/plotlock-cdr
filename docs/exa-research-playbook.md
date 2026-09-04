# PlotLock × Exa Research Playbook

Source adapted from [trenddalkak — ChatGPT·Codex Exa plugin guide](https://cactus-tank-78c.notion.site/trenddalkak-GPT-Codex-Exa-3c7fc9a2be9580dd9322f5a819ff3147) (2026-08 update) and the local `exa-search` agent skill. Use this when expanding PlotLock’s sealed-market experiment beyond the hackathon mock.

## Why Exa for this project

PlotLock’s claims sit on **information cascades / herding**, **prediction markets**, and **cryptographic commitments**. Those literatures are easy to miss with keyword-only Scholar search when you only remember the *idea* (“odds as social proof spoil the plot”). Exa’s semantic + `category=publication` index is built for that tip-of-the-tongue discovery.

| Engine (Exa announcement, 2026-07-23) | Recall | MRR | Avg latency |
|---|---:|---:|---:|
| Exa | 86.4% | 0.726 | 0.578s |
| Perplexity | 66.8% | 0.568 | 1.277s |
| Parallel Advanced | 50.0% | 0.312 | 3.118s |
| Google Scholar | 28.0% | 0.179 | 1.098s |

**Rule:** Exa for *content-based discovery*; Scholar / RISS / WoS for *known metadata* (exact title, Korean theses, citation counts). Mix them — do not claim “no prior work” from one engine.

## Setup options

1. **ChatGPT / Codex plugin** — Work mode → Plugins → install **Exa** → login (card not required for free credits). Enables Search + Read + Research together.
2. **Agent skill (`exa-search`)** — needs `EXA_API_KEY`. Prefer `--category "research paper"` for scholarly bias.
3. **API / Playground** — [exa.ai](https://exa.ai) dashboard; free tier historically ~$20 signup + ~$10/mo credits (~1.4k searches / $10). Confirm live pricing at https://exa.ai/pricing.

Always set **`category=publication` / `--category "research paper"`** so blogs and news do not contaminate the paper list.

## Copy-paste prompts for PlotLock hypotheses

Replace bracketed bits. Prefer messy natural language over forced keywords.

### A. Tip-of-the-tongue (H1 — herding / cascades)

```text
Find the paper about people ignoring their private signal and following the early public majority —
like Bikhchandani-style information cascades — especially when applied to prediction markets or
betting odds that are visible to later participants.
```

```text
I remember a result where showing live vote percentages made later voters copy the leader even when
they had independent information. Looking for the forecasting / prediction-market version of that,
not just fashion or restaurant cascades.
```

### B. Topic + date filter (recent work)

```text
Research papers since 2020 on herding, social influence, or information cascades in prediction
markets when odds or order books are public. Prefer empirical or experimental designs over pure
opinion pieces. category=publication
```

```text
Papers on sealed-bid or commitment-based forecasting contests where individual forecasts stay
hidden until a common reveal time. Include mechanism-design and crypto-commitment angles.
start_published_date=2018-01-01
```

### C. Search → read → cite pack (for `docs/` evidence ledger)

```text
Using Exa publication search, find 5–8 core papers on (1) information cascades, (2) prediction-market
herding, (3) cryptographic commitments / sealed auctions for forecasts. For each: title, year,
venue, one-sentence finding, how it supports or challenges PlotLock H1/H2/R1. Output a markdown
table I can paste into an evidence ledger. Do not invent citations.
```

### D. Field map (when scoping the experiment)

```text
Map the research landscape connecting prediction markets, information cascades, and spoiler /
social-proof effects in entertainment or media. List seminal papers, recent reviews, and open
questions relevant to blinding odds until an event resolves.
```

### E. Exact-paper narrowing

```text
Find the exact paper that introduced information cascades with the sequential decision model
where agents see prior actions but not private signals of others.
```

## Agent-skill commands (when `EXA_API_KEY` is set)

```bash
SKILL=/home/ubuntu/.agents/skills/exa-search

# Academic pass
uv run --with exa-py python "$SKILL/scripts/exa_search.py" \
  "information cascades in prediction markets with public odds" \
  --category "research paper" \
  --include-domains "arxiv.org,ssrn.com,nber.org,econometricsociety.org,nature.com,science.org" \
  --start-published-date 2015-01-01 \
  --highlights \
  -o docs/research/cascades-academic.json

# General pass (labs, posts, benchmarks — merge after academic)
uv run --with exa-py python "$SKILL/scripts/exa_search.py" \
  "prediction market herding live odds spoiler social proof" \
  --highlights \
  -o docs/research/cascades-general.json
```

Two-pass merge: lead with academic hits, then non-academic only for product/UX context. Keep search date + query in the ledger.

## Companion tools (from the Notion guide)

| Need | Prefer |
|---|---|
| Exact title/author already known | Google Scholar |
| Korean theses / KR journals | RISS, DBpia |
| Citation counts / IF | Web of Science, Scopus |
| Semantic “that paper about…” | Exa `publication` |
| PDF tables / scanned appendices | Exa (OCR-indexed) — still verify the PDF |

Note: ChatGPT **Agent mode (`/agent`)** is not an Exa feature; it bills separately.

## Evidence ledger template

Paste Exa (or Scholar) rows here — never auto-accept rankings as truth.

| Date | Query | Source engine | Title | Year | Supports | Challenges | Keep? |
|---|---|---|---|---|---|---|---|
| | | Exa publication | | | H1 / H2 / … | R1 / R2 / … | Y/N |

Related product hypotheses: [`experiment-design.md`](./experiment-design.md).
