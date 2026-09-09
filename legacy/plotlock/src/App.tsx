import { useMemo, useState } from "react";
import type {
  InsightReport,
  MockCdrVault,
  OutcomePayload,
  PredictionPayload,
  PublicSubmission,
  RevealResult,
  StoryMarket
} from "./types";
import { defaultMarket, demoWallets } from "./lib/market";
import {
  compactHash,
  createCommitment,
  readMockCdrVault,
  writeMockCdrVault
} from "./lib/mockCdr";
import "./styles.css";

const creatorWallet = "0xCREATOR000000000000000000000000000000000";

function makeSalt(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function buildInsight(market: StoryMarket, predictions: PredictionPayload[]): InsightReport {
  const distribution: Record<string, number> = Object.fromEntries(
    market.options.map((option) => [option, 0])
  );
  predictions.forEach((prediction) => {
    distribution[prediction.selectedOption] = (distribution[prediction.selectedOption] ?? 0) + 1;
  });

  return {
    marketId: market.id,
    totalPredictions: predictions.length,
    distribution,
    topClue: "Warehouse scene disappearance",
    note:
      "This report becomes valuable after the reveal: it shows what fans suspected without leaking live odds before release."
  };
}

export default function App() {
  const [market, setMarket] = useState<StoryMarket>(defaultMarket);
  const [selectedWallet, setSelectedWallet] = useState(demoWallets[0]);
  const [selectedOption, setSelectedOption] = useState(market.options[0]);
  const [confidence, setConfidence] = useState(76);
  const [reasoning, setReasoning] = useState(
    "Rina disappeared during the warehouse scene and had access to the archive room."
  );
  const [predictionVaults, setPredictionVaults] = useState<MockCdrVault[]>([]);
  const [outcomeVault, setOutcomeVault] = useState<MockCdrVault | null>(null);
  const [publicLedger, setPublicLedger] = useState<PublicSubmission[]>([]);
  const [logs, setLogs] = useState<string[]>([
    "PlotLock demo ready. Live prediction distribution is hidden by design."
  ]);
  const [revealResult, setRevealResult] = useState<RevealResult | null>(null);
  const [livePeekError, setLivePeekError] = useState<string | null>(null);

  const hasSubmitted = useMemo(
    () => publicLedger.some((entry) => entry.wallet === selectedWallet && entry.marketId === market.id),
    [publicLedger, selectedWallet, market.id]
  );

  function addLog(message: string) {
    setLogs((previous) => [message, ...previous].slice(0, 8));
  }

  async function sealOutcome() {
    const payload: OutcomePayload = {
      marketId: market.id,
      correctAnswer: "Rina",
      proof: "Episode 8 final scene, timestamp 18:42. Creator attests Rina is the traitor.",
      creatorSignature: `${creatorWallet.slice(0, 10)}...signed-demo-proof`,
      releasedAt: new Date().toISOString()
    };

    const vault = await writeMockCdrVault({
      kind: "outcome",
      payload,
      readCondition: "MarketClosedReadCondition",
      metadata: {
        marketId: market.id,
        ipAssetId: market.ipAssetId,
        spoiler: "official-outcome-proof"
      }
    });

    setOutcomeVault(vault);
    addLog(`Creator sealed official outcome proof in CDR vault ${vault.vaultId}.`);
  }

  async function submitPrediction() {
    if (market.status !== "open") {
      addLog("Market is already closed. New predictions are disabled.");
      return;
    }
    if (hasSubmitted) {
      addLog("This wallet already submitted a sealed prediction.");
      return;
    }

    const salt = makeSalt();
    const payload: PredictionPayload = {
      marketId: market.id,
      wallet: selectedWallet,
      selectedOption,
      confidence,
      reasoning,
      salt,
      submittedAt: new Date().toISOString()
    };
    const commitmentHash = await createCommitment({
      marketId: market.id,
      wallet: selectedWallet,
      selectedOption,
      salt
    });
    const vault = await writeMockCdrVault({
      kind: "prediction",
      payload,
      readCondition: "MarketClosedReadCondition",
      metadata: {
        marketId: market.id,
        wallet: selectedWallet,
        publicCommitmentOnly: "true"
      }
    });

    const submission: PublicSubmission = {
      wallet: selectedWallet,
      marketId: market.id,
      commitmentHash,
      vaultId: vault.vaultId,
      submittedAt: payload.submittedAt,
      stakeLabel: "10 points"
    };

    setPredictionVaults((previous) => [...previous, vault]);
    setPublicLedger((previous) => [...previous, submission]);
    setLivePeekError(null);
    addLog(
      `Fan prediction sealed. Public ledger stores commitment ${compactHash(
        commitmentHash
      )}, not the selected option.`
    );
  }

  async function tryPeekLiveResults() {
    setLivePeekError(null);
    try {
      if (predictionVaults.length === 0) {
        throw new Error("No predictions have been sealed yet.");
      }
      await readMockCdrVault<PredictionPayload>(predictionVaults[0], market.status === "closed");
      addLog("Market is closed, so CDR reads are now allowed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown CDR read error";
      setLivePeekError(message);
      addLog("Live results blocked by CDR read condition to prevent spoilers and herding.");
    }
  }

  function closeMarket() {
    setMarket((previous) => ({ ...previous, status: "closed" }));
    addLog("Creator closed the market. Reveal condition is now satisfied.");
  }

  async function revealMarket() {
    if (market.status !== "closed") {
      addLog("Close the market first. CDR read condition is still locked.");
      return;
    }
    if (!outcomeVault) {
      addLog("Seal the outcome proof first.");
      return;
    }

    const outcome = await readMockCdrVault<OutcomePayload>(outcomeVault, true);
    const predictions = await Promise.all(
      predictionVaults.map((vault) => readMockCdrVault<PredictionPayload>(vault, true))
    );
    const insight = buildInsight(market, predictions);

    setRevealResult({ outcome, predictions, insight });
    addLog("CDR reveal complete. Outcome, predictions, and post-reveal insights decrypted.");
  }

  function resetDemo() {
    setMarket(defaultMarket);
    setSelectedWallet(demoWallets[0]);
    setSelectedOption(defaultMarket.options[0]);
    setConfidence(76);
    setPredictionVaults([]);
    setOutcomeVault(null);
    setPublicLedger([]);
    setRevealResult(null);
    setLivePeekError(null);
    setLogs(["Demo reset. Predictions and outcome vaults are empty."]);
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Story CDR Hackathon Demo</p>
          <h1>PlotLock</h1>
          <p className="subtitle">Spoilerless IP prediction markets.</p>
          <p className="hero-copy">
            Fans predict the ending without seeing the crowd. Prediction payloads and official
            outcomes stay encrypted until the story reveal condition is satisfied.
          </p>
          <div className="hero-actions">
            <button onClick={sealOutcome} disabled={Boolean(outcomeVault)}>
              {outcomeVault ? "Outcome sealed" : "1. Creator seals outcome"}
            </button>
            <button className="secondary" onClick={resetDemo}>
              Reset demo
            </button>
          </div>
        </div>
        <div className="principle-card">
          <span>Core principle</span>
          <strong>Predict the ending without seeing the crowd.</strong>
          <p>
            Public contract data shows only commitments, participant count, and pool size. The
            answer, live distribution, and fan reasoning stay inside CDR-encrypted vaults.
          </p>
        </div>
      </section>

      <section className="grid two-columns">
        <article className="card market-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">IP Asset</p>
              <h2>{market.ipAssetName}</h2>
            </div>
            <span className={`status ${market.status}`}>{market.status}</span>
          </div>
          <h3>{market.title}</h3>
          <p>{market.question}</p>
          <dl className="stats">
            <div>
              <dt>Participants</dt>
              <dd>{publicLedger.length}</dd>
            </div>
            <div>
              <dt>Prize pool</dt>
              <dd>{market.prizePoolLabel}</dd>
            </div>
            <div>
              <dt>Live distribution</dt>
              <dd className="locked">Locked by CDR</dd>
            </div>
          </dl>
          <div className="option-list">
            {market.options.map((option) => (
              <span key={option}>{option}</span>
            ))}
          </div>
          <p className="tiny">{market.deadlineLabel}</p>
        </article>

        <article className="card form-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Fan action</p>
              <h2>Submit sealed prediction</h2>
            </div>
            {hasSubmitted ? <span className="pill">submitted</span> : <span className="pill">ready</span>}
          </div>

          <label>
            Wallet
            <select value={selectedWallet} onChange={(event) => setSelectedWallet(event.target.value)}>
              {demoWallets.map((wallet) => (
                <option value={wallet} key={wallet}>
                  {wallet.slice(0, 12)}...{wallet.slice(-5)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Prediction
            <select value={selectedOption} onChange={(event) => setSelectedOption(event.target.value)}>
              {market.options.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Confidence: {confidence}%
            <input
              type="range"
              min="1"
              max="100"
              value={confidence}
              onChange={(event) => setConfidence(Number(event.target.value))}
            />
          </label>

          <label>
            Reasoning, encrypted until reveal
            <textarea value={reasoning} onChange={(event) => setReasoning(event.target.value)} />
          </label>

          <button onClick={submitPrediction} disabled={hasSubmitted || market.status !== "open"}>
            2. Seal prediction with CDR
          </button>
        </article>
      </section>

      <section className="grid three-columns">
        <article className="card">
          <p className="eyebrow">Public ledger</p>
          <h2>No spoilers here</h2>
          <p>
            The public layer records commitment hashes and CDR vault IDs only. It does not record
            selected options or live percentages.
          </p>
          <div className="ledger">
            {publicLedger.length === 0 ? (
              <span className="muted">No public commitments yet.</span>
            ) : (
              publicLedger.map((entry) => (
                <div className="ledger-row" key={entry.commitmentHash}>
                  <span>{entry.wallet.slice(0, 8)}...{entry.wallet.slice(-4)}</span>
                  <code>{compactHash(entry.commitmentHash)}</code>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card">
          <p className="eyebrow">Spoiler guard</p>
          <h2>Try to view live results</h2>
          <p>
            Before the market closes, CDR read conditions block the encrypted prediction payloads.
          </p>
          <button className="secondary" onClick={tryPeekLiveResults}>
            3. Try live results
          </button>
          {livePeekError ? <p className="error-box">{livePeekError}</p> : null}
        </article>

        <article className="card">
          <p className="eyebrow">Creator resolve</p>
          <h2>Reveal after story release</h2>
          <p>
            Closing the market simulates the episode release. After that, CDR reveal is allowed.
          </p>
          <div className="stacked-actions">
            <button className="secondary" onClick={closeMarket} disabled={market.status === "closed"}>
              4. Close market
            </button>
            <button onClick={revealMarket}>5. CDR reveal</button>
          </div>
        </article>
      </section>

      <section className="grid two-columns">
        <article className="card reveal-card">
          <p className="eyebrow">Post-reveal result</p>
          <h2>Outcome and predictions</h2>
          {!revealResult ? (
            <p className="muted">Reveal results will appear here after the CDR read condition passes.</p>
          ) : (
            <RevealPanel result={revealResult} />
          )}
        </article>

        <article className="card log-card">
          <p className="eyebrow">Demo logs</p>
          <h2>CDR UX trace</h2>
          <ul>
            {logs.map((log, index) => (
              <li key={`${log}-${index}`}>{log}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}

function RevealPanel({ result }: { result: RevealResult }) {
  const rows = Object.entries(result.insight.distribution);
  const correctWallets = result.predictions.filter(
    (prediction) => prediction.selectedOption === result.outcome.correctAnswer
  );

  return (
    <div className="reveal-panel">
      <div className="answer-box">
        <span>Official answer</span>
        <strong>{result.outcome.correctAnswer}</strong>
        <p>{result.outcome.proof}</p>
      </div>

      <div className="distribution">
        {rows.map(([option, count]) => (
          <div key={option} className="distribution-row">
            <span>{option}</span>
            <meter min="0" max={Math.max(1, result.insight.totalPredictions)} value={count} />
            <strong>{count}</strong>
          </div>
        ))}
      </div>

      <div className="winner-box">
        <span>Correct predictors</span>
        <strong>{correctWallets.length}</strong>
        <p>{result.insight.note}</p>
      </div>
    </div>
  );
}
