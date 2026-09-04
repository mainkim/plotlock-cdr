# PlotLock — Sealed Experiment Design Brief

Grounded in K-Dense **hypothesis-generation**, **experimental-design**, and **scientific-visualization** skills, plus Exa / paper-lookup for prior-art discovery. Hypotheses below are **candidates to test**, not established findings.

## 1. Observation (frozen before interpretation)

Story IP prediction markets that show live vote percentages:

- leak narrative information before release (spoilers);
- expose early majority counts that can induce herding;
- put selected options and reasoning in the public layer.

Observed in product practice / product thesis (not a causal claim yet): public odds double as both market signal and story spoiler.

## 2. Research question

**Does a sealed (blinded) prediction market — public commitments only until story release — reduce spoiler leakage and early herding while keeping outcomes verifiable?**

PICOT-style framing (product experiment, not a clinical trial):

| Element | Definition |
|---|---|
| Population | Fans predicting a story beat before release |
| Intervention | PlotLock sealed vaults (CDR) + commitment ledger |
| Comparator | Conventional open-odds prediction UI |
| Outcome | Spoiler exposure rate; herding / cascade indicators; trust in reveal |
| Time | From market open → episode release → CDR reveal |

## 3. Candidate hypotheses (rivals first)

| ID | Candidate | Class |
|---|---|---|
| H1 | Blinding the distribution until reveal reduces early-majority cascades | Mechanism (information cascade) |
| H2 | Commitment hashes preserve auditability without leaking options | Mechanism (cryptographic commitment) |
| H3 | Post-reveal distribution + clues become valuable insight, not a spoiler | Product value claim |
| R1 | Without live social proof, participation collapses | Rival (engagement confound) |
| R2 | Users infer spoilers from participant count / pool alone | Rival (leak via metadata) |
| R3 | Any accuracy gain is selection bias (only confident fans seal) | Rival (selection) |
| N0 | No difference in herding vs open-odds UI under the same IP | Null for H1 |

Do not treat H1–H3 as proven. Discriminating predictions belong in a preregistered analysis plan before A/B data collection.

## 4. Experimental design (product protocol)

Fisher principles applied to the demo UX:

1. **Randomization** — demo wallets act as independent units; one sealed prediction per wallet (no pseudoreplication by re-submitting the same unit).
2. **Replication** — multiple fan wallets before close; `n` is always shown on reveal charts.
3. **Blocking / blinding** — CDR `MarketClosedReadCondition` blinds payloads until the creator closes the market (story-release proxy).

### Factorial sketch for a future study (not yet shipped)

| Factor | Levels |
|---|---|
| Odds visibility | Open | Sealed (PlotLock) |
| Reasoning visibility | Public | Encrypted until reveal |
| Commitment layer | None | On-chain / mock commitment hash |

Primary contrast for v1 demo: **Sealed + Encrypted reasoning + Commitment**.

### Run order (demo = sequential protocol)

1. Creator seals outcome proof (allocation of ground truth).
2. Fans seal predictions (enrollment).
3. Attempt live peek → expected failure (negative control for blinding).
4. Close market (release condition).
5. CDR reveal → decrypt + honest distribution.

## 5. Measurement & visualization rules

From **scientific-visualization**:

- Encode counts with **position/length** on a common scale from zero.
- Label **n** (total predictions) and unit of replication (wallet).
- Use **Okabe–Ito** categorical colors + direct labels (color is not the only cue).
- Distinguish **missing / locked / revealed** states explicitly; never invent live percentages while sealed.
- Uncertainty: for small demo `n`, show raw counts — do not draw misleading CI ribbons.

## 6. Literature / discovery tooling (Exa + paper-lookup)

When expanding this experiment beyond the hackathon mock:

1. **Exa** (`category=publication` / research-paper) — semantic tip-of-the-tongue search for information cascades, prediction-market herding, commitment schemes.
2. **paper-lookup** — PubMed / arXiv / Semantic Scholar / OpenAlex provenance pack for citations.
3. Keep an evidence ledger: search date, query, included/excluded sources; never claim “no prior work.”

Suggested discovery prompts (Exa-style):

- “information cascades in prediction markets when odds are public”
- “cryptographic commitments for sealed-bid auctions applied to forecasting”
- “spoiler avoidance and social proof in entertainment fandom platforms”

## 7. Safety / product boundaries

- Demo uses mock CDR; not production key custody.
- Insights after reveal are descriptive fan tallies, not scientific proof of H1.
- Any real user study needs consent, clear stakes, and a preregistered analysis plan.
