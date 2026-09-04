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

/** Okabe–Ito categorical palette (scientific-visualization skill). */
const OKABE_ITO = ["#E69F00", "#56B4E9", "#009E73", "#CC79A7", "#0072B2", "#D55E00"];

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
      "Post-reveal tally only. Counts are wallet-level replicates (n labeled). Not evidence that sealing reduces herding."
  };
}

type Phase = "seal" | "predict" | "blind" | "reveal";

function currentPhase(args: {
  outcomeVault: MockCdrVault | null;
  ledgerCount: number;
  status: StoryMarket["status"];
  revealed: boolean;
}): Phase {
  if (args.revealed) return "reveal";
  if (args.status === "closed") return "reveal";
  if (args.ledgerCount > 0) return "blind";
  if (args.outcomeVault) return "predict";
  return "seal";
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
    "PlotLock sealed experiment ready. Live distribution blinded by design."
  ]);
  const [revealResult, setRevealResult] = useState<RevealResult | null>(null);
  const [livePeekError, setLivePeekError] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);

  const hasSubmitted = useMemo(
    () => publicLedger.some((entry) => entry.wallet === selectedWallet && entry.marketId === market.id),
    [publicLedger, selectedWallet, market.id]
  );

  const phase = currentPhase({
    outcomeVault,
    ledgerCount: publicLedger.length,
    status: market.status,
    revealed: Boolean(revealResult)
  });

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
      addLog("Live results blocked by CDR read condition — negative control for blinding.");
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
    addLog("CDR reveal complete. Outcome, predictions, and post-reveal tallies decrypted.");
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
    setEntered(false);
    setLogs(["Demo reset. Predictions and outcome vaults are empty."]);
  }

  return (
    <div className="app-root">
      {!entered ? (
        <section className="hero-bleed" aria-label="PlotLock hero">
          <div className="hero-visual" aria-hidden="true">
            <div className="cinema-screen">
              <div className="vault-door">
                <span className="vault-ring" />
                <span className="vault-ring delay" />
                <span className="vault-core">LOCKED</span>
              </div>
              <div className="film-grain" />
            </div>
          </div>
          <div className="hero-content">
            <p className="brand">PlotLock</p>
            <h1>Predict the ending without seeing the crowd.</h1>
            <p className="hero-support">
              A sealed IP prediction market: commitments stay public, answers stay encrypted until
              the story releases.
            </p>
            <div className="hero-cta">
              <button type="button" onClick={() => setEntered(true)}>
                Enter sealed market
              </button>
              <button type="button" className="ghost" onClick={resetDemo}>
                Reset
              </button>
            </div>
          </div>
        </section>
      ) : (
        <main className="page-shell">
          <header className="topbar">
            <button type="button" className="brand-link" onClick={() => setEntered(false)}>
              PlotLock
            </button>
            <p className="protocol-tag">Blinded prediction protocol · mock CDR</p>
            <button type="button" className="ghost compact" onClick={resetDemo}>
              Reset
            </button>
          </header>

          <section className="protocol" aria-label="Experiment phases">
            {(
              [
                ["seal", "1 · Seal outcome"],
                ["predict", "2 · Enroll predictions"],
                ["blind", "3 · Stay blinded"],
                ["reveal", "4 · Reveal"]
              ] as const
            ).map(([id, label]) => (
              <div key={id} className={`phase ${phase === id ? "active" : ""}`}>
                {label}
              </div>
            ))}
          </section>

          <section className="hypothesis-strip">
            <p>
              <strong>Working hypothesis (candidate):</strong> blinding live odds until release
              reduces herding and spoilers while commitment hashes keep the market auditable. Rival
              explanations and nulls live in{" "}
              <code>docs/experiment-design.md</code>.
            </p>
          </section>

          <section className="workspace">
            <article className="panel market-panel">
              <div className="panel-head">
                <div>
                  <p className="kicker">{market.ipAssetName}</p>
                  <h2>{market.title}</h2>
                </div>
                <span className={`status ${market.status}`}>{market.status}</span>
              </div>
              <p className="lede">{market.question}</p>
              <dl className="metrics">
                <div>
                  <dt>n enrolled</dt>
                  <dd>{publicLedger.length}</dd>
                </div>
                <div>
                  <dt>Pool</dt>
                  <dd>{market.prizePoolLabel}</dd>
                </div>
                <div>
                  <dt>Live odds</dt>
                  <dd className="locked">Blinded</dd>
                </div>
              </dl>
              <ul className="option-rail">
                {market.options.map((option) => (
                  <li key={option}>{option}</li>
                ))}
              </ul>
              <p className="tiny">{market.deadlineLabel}</p>
              <div className="inline-actions">
                <button type="button" onClick={sealOutcome} disabled={Boolean(outcomeVault)}>
                  {outcomeVault ? "Outcome sealed" : "Seal official outcome"}
                </button>
              </div>
            </article>

            <article className="panel form-panel">
              <div className="panel-head">
                <div>
                  <p className="kicker">Fan enrollment</p>
                  <h2>Seal your prediction</h2>
                </div>
                <span className="chip">{hasSubmitted ? "submitted" : "ready"}</span>
              </div>

              <label>
                Wallet (unit of replication)
                <select
                  value={selectedWallet}
                  onChange={(event) => setSelectedWallet(event.target.value)}
                >
                  {demoWallets.map((wallet) => (
                    <option value={wallet} key={wallet}>
                      {wallet.slice(0, 12)}…{wallet.slice(-5)}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="option-fieldset">
                <legend>Prediction</legend>
                <div className="option-grid">
                  {market.options.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={`option-btn ${selectedOption === option ? "selected" : ""}`}
                      onClick={() => setSelectedOption(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

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
                Reasoning (encrypted until reveal)
                <textarea
                  value={reasoning}
                  onChange={(event) => setReasoning(event.target.value)}
                />
              </label>

              <button
                type="button"
                onClick={submitPrediction}
                disabled={hasSubmitted || market.status !== "open" || !outcomeVault}
              >
                Seal prediction with CDR
              </button>
              {!outcomeVault ? (
                <p className="tiny warn">Seal the official outcome first — protocol order.</p>
              ) : null}
            </article>
          </section>

          <section className="workspace tertiary">
            <article className="panel">
              <p className="kicker">Public ledger</p>
              <h2>Commitments only</h2>
              <p className="lede">
                Hashes and vault IDs are public. Selected options and live percentages are not.
              </p>
              <div className="ledger">
                {publicLedger.length === 0 ? (
                  <span className="muted">No public commitments yet.</span>
                ) : (
                  publicLedger.map((entry) => (
                    <div className="ledger-row" key={entry.commitmentHash}>
                      <span>
                        {entry.wallet.slice(0, 8)}…{entry.wallet.slice(-4)}
                      </span>
                      <code>{compactHash(entry.commitmentHash)}</code>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="panel">
              <p className="kicker">Negative control</p>
              <h2>Try live results</h2>
              <p className="lede">
                Before close, CDR should refuse the read — proving the blind still holds.
              </p>
              <button type="button" className="ghost" onClick={tryPeekLiveResults}>
                Attempt live peek
              </button>
              {livePeekError ? <p className="error-box">{livePeekError}</p> : null}
            </article>

            <article className="panel">
              <p className="kicker">Release condition</p>
              <h2>Close &amp; reveal</h2>
              <p className="lede">Closing simulates episode release, then CDR decrypts.</p>
              <div className="stacked-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={closeMarket}
                  disabled={market.status === "closed"}
                >
                  Close market
                </button>
                <button type="button" onClick={revealMarket}>
                  CDR reveal
                </button>
              </div>
            </article>
          </section>

          <section className="workspace">
            <article className="panel reveal-panel-wrap">
              <p className="kicker">Post-reveal result</p>
              <h2>Outcome &amp; honest tally</h2>
              {!revealResult ? (
                <p className="muted">Results appear after the read condition passes.</p>
              ) : (
                <RevealPanel result={revealResult} />
              )}
            </article>

            <article className="panel log-panel">
              <p className="kicker">Protocol log</p>
              <h2>CDR trace</h2>
              <ul>
                {logs.map((log, index) => (
                  <li key={`${log}-${index}`}>{log}</li>
                ))}
              </ul>
            </article>
          </section>
        </main>
      )}
    </div>
  );
}

function RevealPanel({ result }: { result: RevealResult }) {
  const rows = Object.entries(result.insight.distribution);
  const n = Math.max(1, result.insight.totalPredictions);
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

      <div className="distribution" role="img" aria-label={`Prediction counts, n=${n}`}>
        <p className="chart-meta">
          Wallet-level counts · <strong>n = {result.insight.totalPredictions}</strong> · scale from
          zero · Okabe–Ito colors
        </p>
        {rows.map(([option, count], index) => {
          const pct = (count / n) * 100;
          return (
            <div key={option} className="distribution-row">
              <span className="opt-label">{option}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: OKABE_ITO[index % OKABE_ITO.length]
                  }}
                />
              </div>
              <strong className="count">{count}</strong>
            </div>
          );
        })}
      </div>

      <div className="winner-box">
        <span>Correct predictors</span>
        <strong>{correctWallets.length}</strong>
        <p>{result.insight.note}</p>
      </div>
    </div>
  );
}
