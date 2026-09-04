# PlotLock — Spoilerless IP Prediction Markets

**Predict the ending without seeing the crowd. Reveal only after the story does.**

PlotLock is framed as a **sealed prediction experiment**: public commitments stay visible, live odds stay blinded until story release, then CDR reveal unlocks an honest tally (`n` labeled, Okabe–Ito encoding). Design rationale and hypotheses: [`docs/experiment-design.md`](docs/experiment-design.md). Exa publication-search playbook (trenddalkak guide → PlotLock prompts): [`docs/exa-research-playbook.md`](docs/exa-research-playbook.md).

PlotLock is a Story CDR hackathon app concept for spoilerless prediction markets around story-based IP: comics, games, anime, novels, dramas, quests, and finales.

Fans can predict outcomes such as:

- Who is the traitor in Episode 8?
- Which ending will become canon?
- Which couple will survive the finale?
- Which character is the hidden boss?

Unlike normal prediction markets, PlotLock does **not** show live vote distribution. Early votes can create herding, and live odds can become spoilers. PlotLock stores only public-safe commitments on-chain and keeps the actual prediction payloads encrypted with CDR until the story reveal condition is satisfied.

---

## Why this needs CDR

Normal prediction markets leak the crowd:

```text
Rina 72%
Joon 10%
Mira 12%
No traitor 6%
```

For story IP, that is a spoiler. It also makes later users follow the early majority.

PlotLock changes the pattern:

```text
Public before reveal:
- market question
- participant count
- total pool
- commitment hashes
- CDR vault references

Private until reveal:
- selected option
- confidence score
- fan reasoning
- official answer proof
- post-reveal insight report
```

CDR is the core product primitive: predictions and outcome proofs stay encrypted until the read condition passes.

---

## Demo flow

The included UI is a clickable browser demo using a local `mockCdr` adapter that simulates CDR-style sealed vault UX with Web Crypto. This lets judges understand the full product flow without needing a funded wallet.

1. Creator seals the official outcome proof.
2. Fan submits a prediction.
3. The app stores a public commitment hash, not the selected option.
4. User tries to view live results.
5. Read fails because the market is still open.
6. Creator closes the market to simulate episode release.
7. CDR reveal decrypts the outcome, predictions, and post-reveal insights.

The real CDR integration boundary is documented in `src/lib/realCdr.ts` and the CDR smoke-test script is in `scripts/ownerOnlySecret.ts`.

---

## Architecture

### Public contract layer

`contracts/PlotLockMarket.sol` stores:

- market creator
- IP asset hash
- options hash
- question
- deadline
- participant count
- prediction commitment hash
- CDR vault reference hash
- market status

It intentionally does **not** store:

- selected option
- live distribution
- answer key
- fan reasoning
- spoiler comments

This is important because CDR protects encrypted payloads, but public contract metadata must also avoid leaking spoilers.

### CDR vault layer

PlotLock uses three vault types:

#### 1. Prediction Vault

Encrypted fan payload:

```json
{
  "marketId": "cyber-academy-ep8-traitor",
  "wallet": "0x...",
  "selectedOption": "Rina",
  "confidence": 76,
  "reasoning": "Rina disappeared during the warehouse scene.",
  "salt": "random-secret"
}
```

Public contract only stores:

```text
commitment = hash(marketId, wallet, selectedOption, salt)
vaultRefHash = hash(cdrVaultId)
```

#### 2. Outcome Vault

Encrypted creator proof:

```json
{
  "correctAnswer": "Rina",
  "proof": "Episode 8 timestamp 18:42",
  "creatorSignature": "0x..."
}
```

#### 3. Insight Vault

Post-reveal fan insight data for IP owners:

```json
{
  "distribution": {
    "Rina": 42,
    "Joon": 25,
    "Mira": 20,
    "No traitor": 13
  },
  "topClue": "Warehouse scene disappearance"
}
```

This can become a CDR-powered data marketplace for IP owners, studios, writers, and fandom teams.

---

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

---

## Real Story CDR integration plan

The browser demo runs in mock mode. To connect it to Story CDR on Aeneid:

1. Install and configure `@piplabs/cdr-sdk` and `viem`.
2. Call `initWasm()` once before CDR encryption/decryption.
3. Create a `CDRClient` with `publicClient`, `walletClient`, and `apiUrl`.
4. For prediction payloads, use a small encrypted secret flow with `uploadCDR` / `accessCDR`, or low-level `allocate` / `write` / `accessCDR`.
5. For official answer files and insight reports, use encrypted file delivery with `uploadFile` / `downloadFile`.
6. Use a custom read condition such as `MarketClosedReadCondition`, or Story `LicenseReadCondition` for IP-gated reveal / insight access.

The smoke test script demonstrates an owner-only CDR flow:

```bash
cp .env.example .env
# Add WALLET_PRIVATE_KEY for a funded Aeneid testnet wallet
npm run cdr:owner-only
```

---

## Hackathon submission text

### Title

**PlotLock — Spoilerless IP Prediction Markets**

### One-liner

A spoilerless prediction market for story IP where fans commit predictions before a story release, but live vote distribution, reasoning, and outcome proofs stay encrypted with CDR until reveal.

### CDR usage

PlotLock uses CDR to encrypt prediction payloads, official outcome proofs, and post-reveal fan insight reports. The public smart contract stores only commitment hashes and vault references, so live results do not leak spoilers. When the market closes or the required Story license condition is satisfied, CDR allows authorized decryption and the app reveals the correct answer, user predictions, and insight report.

---

## Repository guide for judges

- `src/App.tsx` — clickable PlotLock demo UX
- `src/lib/mockCdr.ts` — local encrypted-vault simulation for demo mode
- `src/lib/realCdr.ts` — real Story CDR integration boundary
- `contracts/PlotLockMarket.sol` — public commitment contract design
- `scripts/ownerOnlySecret.ts` — CDR SDK smoke-test script
- `docs/hackathon-submission.md` — form-ready project description

---

## Important privacy note

CDR protects encrypted vault contents. It does not hide public metadata such as transaction timing, vault references, contract events, or off-chain pointers that the app chooses to disclose. PlotLock therefore avoids storing selected options, option-specific vote totals, answer keys, or spoiler reasoning on-chain before reveal.
