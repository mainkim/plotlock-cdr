/** Haebom core domain types — identity spine: study / version / participant / session / condition */

export type StudyStatus = "draft" | "review" | "approved" | "published" | "closed";
export type VersionStatus = "draft" | "review" | "approved" | "published";
export type DesignType = "between_subject" | "within_subject" | "mixed";

export type FactorLevel = {
  id: string;
  label: string;
};

export type Factor = {
  id: string;
  name: string;
  levels: FactorLevel[];
};

export type Condition = {
  id: string;
  label: string;
  factorLevels: Record<string, string>; // factorId -> levelId
  stimulusId: string;
};

export type Stimulus = {
  id: string;
  conditionId: string;
  title: string;
  body: string;
  tone: "neutral" | "warm" | "other";
  reasonShown: boolean;
  reasonText?: string;
  ctaLabel: string;
  criteriaButtonLabel: string;
  criteriaDetail: string;
  /** RAG / grounded generation provenance */
  groundedCitations?: GroundedCitation[];
};

/** Uploaded or pasted research material for grounded (RAG) generation */
export type SourceDocument = {
  id: string;
  title: string;
  authors?: string;
  year?: number;
  kind: "paper" | "plan" | "feedback" | "note" | "other";
  text: string;
  addedAt: string;
  /** Optional ResearchRabbit-style links: this paper cites these source ids */
  citesSourceIds?: string[];
  doi?: string;
  openAlexId?: string;
  semanticScholarId?: string;
  citedByCount?: number;
  collectionId?: string;
  venue?: string;
  keywords?: string[];
  literatureType?: "journal" | "thesis" | "conference" | "review";
};

export type SourceCollection = {
  id: string;
  name: string;
  color: string;
};

export type SourceChunk = {
  id: string;
  sourceId: string;
  index: number;
  text: string;
};

export type GroundedCitation = {
  sourceId: string;
  sourceTitle: string;
  chunkId: string;
  excerpt: string;
};

export type LineageEdge = {
  id: string;
  fromSourceId: string;
  toSourceId: string;
  relation: "cites" | "cited_by" | "related";
  note?: string;
};

export type SourceLibrary = {
  documents: SourceDocument[];
  edges: LineageEdge[];
  collections?: SourceCollection[];
  lastGroundedAt?: string;
  groundingMode: "rag_corpus_only";
};

export type GroundedStimulusSuggestion = {
  conditionId: string;
  title: string;
  body: string;
  reasonText?: string;
  reasonShown: boolean;
  tone: "neutral" | "warm" | "other";
  ctaLabel: string;
  criteriaDetail: string;
  citations: GroundedCitation[];
  refusalReason?: string;
};

export type MeasureType = "likert" | "choice" | "text" | "attention_check" | "manipulation_check";

export type Measure = {
  id: string;
  construct: string;
  questionText: string;
  type: MeasureType;
  stage: "pre" | "post" | "attention" | "manipulation";
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: string[];
  options?: string[];
  required: boolean;
  reverseCoded?: boolean;
  correctAnswer?: string | number;
};

export type BehaviorEventDef = {
  id: string;
  name: string;
  eventType: string;
  objectId: string;
  description: string;
  required: boolean;
};

export type FlowStep =
  | { id: string; type: "consent"; title: string }
  | { id: string; type: "survey"; title: string; stage: "pre" | "post" | "attention" | "manipulation"; measureIds: string[] }
  | { id: string; type: "stimulus"; title: string }
  | { id: string; type: "behavior_task"; title: string; objectId: string }
  | { id: string; type: "debrief"; title: string; body: string }
  | { id: string; type: "complete"; title: string };

export type ReviewRequiredItem = {
  field: string;
  reason: string;
  suggestedAction: string;
};

/** Trace of external/local AI tools used while drafting a study */
export type AiToolCall = {
  tool: "openalex_search" | "openalex_expand" | "semantic_scholar" | "rag_retrieve" | "rag_ground_stimuli";
  status: "ok" | "skipped" | "error";
  input: string;
  outputSummary: string;
  count?: number;
};

export type StudyDraftSpec = {
  title: string;
  researchQuestion: string;
  hypotheses: string[];
  design: {
    type: DesignType;
    factors: Factor[];
  };
  conditions: Condition[];
  flow: FlowStep[];
  stimuli: Stimulus[];
  measures: Measure[];
  behaviorEvents: BehaviorEventDef[];
  reviewRequired: ReviewRequiredItem[];
  /** Corpus for RAG / notebook-style grounded generation */
  sourceLibrary?: SourceLibrary;
  aiMeta?: {
    mode: "template" | "llm" | "rag_grounded" | "tools";
    note: string;
    sourcePrompt: string;
    literatureQuery?: string;
    toolCalls?: AiToolCall[];
  };
};

export type Study = {
  id: string;
  title: string;
  slug: string;
  joinCode: string;
  status: StudyStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  targetN: number;
  currentVersionId: string | null;
  latestDraftVersionId: string | null;
  founderNote?: string;
  isDemo?: boolean;
};

export type StudyVersion = {
  id: string;
  studyId: string;
  versionNumber: number;
  status: VersionStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  publishedAt?: string;
  spec: StudyDraftSpec;
  qaSnapshot?: QaReport;
};

export type AssignmentAlgorithm = "equal_randomization";

export type Assignment = {
  id: string;
  participantId: string;
  studyId: string;
  studyVersionId: string;
  conditionId: string;
  assignmentAlgorithm: AssignmentAlgorithm;
  assignmentSeed: string;
  assignedAt: string;
};

export type Participant = {
  id: string;
  studyId: string;
  studyVersionId: string;
  sessionId: string;
  createdAt: string;
  /** Separate from research data — demo channel only */
  channel: "web" | "toss_miniapp" | "demo";
  externalAuthRef?: string; // never used for research joins
};

export type SessionStatus = "active" | "completed" | "dropout" | "abandoned";

export type Session = {
  id: string;
  participantId: string;
  studyId: string;
  studyVersionId: string;
  conditionId: string;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
  currentStepId: string;
  consentGiven: boolean;
  durationMs?: number;
};

export type Consent = {
  id: string;
  participantId: string;
  sessionId: string;
  studyVersionId: string;
  agreedAt: string;
  textVersion: string;
};

export type SurveyResponse = {
  id: string;
  participantId: string;
  sessionId: string;
  studyId: string;
  studyVersionId: string;
  conditionId: string;
  measureId: string;
  value: string | number;
  responseTimeMs?: number;
  submittedAt: string;
};

export type EventType =
  | "screen_view"
  | "stimulus_impression"
  | "object_click"
  | "response_change"
  | "survey_submit"
  | "step_submit"
  | "visibility_hidden"
  | "visibility_visible"
  | "page_exit"
  | "experiment_complete"
  | "scroll_depth";

export type ResearchEvent = {
  eventId: string;
  studyId: string;
  studyVersionId: string;
  participantId: string;
  sessionId: string;
  conditionId: string;
  stepId?: string;
  screenId?: string;
  objectId?: string;
  eventType: EventType | string;
  sequenceNo: number;
  clientTimestamp: string;
  serverReceivedAt: string;
  elapsedMs?: number;
  payload?: Record<string, unknown>;
};

export type StimulusExposure = {
  id: string;
  participantId: string;
  sessionId: string;
  studyVersionId: string;
  conditionId: string;
  stimulusId: string;
  shownAt: string;
  durationMs?: number;
};

export type QualityFlagType =
  | "attention_check_fail"
  | "too_fast_completion"
  | "missing_required_event"
  | "incomplete_session";

export type QualityFlag = {
  id: string;
  participantId: string;
  sessionId: string;
  studyVersionId: string;
  type: QualityFlagType;
  detail: string;
  createdAt: string;
  inclusionDecision: "pending" | "include" | "exclude";
};

export type QaIssueSeverity = "blocker" | "warning" | "info";
export type QaIssueSource = "rule" | "ai_suggestion";

export type QaIssue = {
  id: string;
  severity: QaIssueSeverity;
  source: QaIssueSource;
  code: string;
  message: string;
  relatedIds?: string[];
};

export type MeasurementMapRow = {
  construct: string;
  measurementMethod: string;
  status: "linked" | "review_needed" | "missing";
  measureId?: string;
  behaviorEventId?: string;
};

export type QaReport = {
  generatedAt: string;
  blockers: QaIssue[];
  warnings: QaIssue[];
  aiSuggestions: QaIssue[];
  measurementMap: MeasurementMapRow[];
  canApprove: boolean;
};

export type ConditionDiffWarning = {
  field: string;
  message: string;
  conditionIds: string[];
};

export type DbShape = {
  meta: {
    app: "haebom";
    schemaVersion: 1;
    demoMode: boolean;
    updatedAt: string;
  };
  studies: Study[];
  versions: StudyVersion[];
  participants: Participant[];
  sessions: Session[];
  assignments: Assignment[];
  consents: Consent[];
  surveyResponses: SurveyResponse[];
  events: ResearchEvent[];
  stimulusExposures: StimulusExposure[];
  qualityFlags: QualityFlag[];
  eventIdIndex: Record<string, true>;
};

export type ParticipantRuntimePayload = {
  participantId: string;
  sessionId: string;
  studyId: string;
  studyTitle: string;
  studyVersionId: string;
  /** Only the assigned condition stimulus — never the full set */
  conditionId: string;
  stimulus: Stimulus;
  flow: FlowStep[];
  measures: Measure[];
  consentText: string;
  debriefText: string;
  currentStepId: string;
  status: SessionStatus;
};
