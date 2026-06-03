export type MarketStatus = "open" | "closed";

export type CdrVaultKind = "prediction" | "outcome" | "insight";

export interface StoryMarket {
  id: string;
  ipAssetName: string;
  ipAssetId: string;
  title: string;
  question: string;
  options: string[];
  deadlineLabel: string;
  prizePoolLabel: string;
  status: MarketStatus;
}

export interface PredictionPayload {
  marketId: string;
  wallet: string;
  selectedOption: string;
  confidence: number;
  reasoning: string;
  salt: string;
  submittedAt: string;
}

export interface OutcomePayload {
  marketId: string;
  correctAnswer: string;
  proof: string;
  creatorSignature: string;
  releasedAt: string;
}

export interface InsightReport {
  marketId: string;
  totalPredictions: number;
  distribution: Record<string, number>;
  topClue: string;
  note: string;
}

export interface MockCdrVault {
  vaultId: string;
  kind: CdrVaultKind;
  readCondition: string;
  ciphertextB64: string;
  ivB64: string;
  exportedKeyB64: string;
  metadata: Record<string, string>;
  createdAt: string;
}

export interface PublicSubmission {
  wallet: string;
  marketId: string;
  commitmentHash: string;
  vaultId: string;
  submittedAt: string;
  stakeLabel: string;
}

export interface RevealResult {
  outcome: OutcomePayload;
  predictions: PredictionPayload[];
  insight: InsightReport;
}
