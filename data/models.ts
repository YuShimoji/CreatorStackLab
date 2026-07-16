export type Verdict = "適合" | "条件付き適合" | "不適合" | "未確認";

export type EvidenceType =
  | "実機検証済み"
  | "公式情報確認済み・実機未検証"
  | "再現可能な第三者報告"
  | "未確認";

export type LinkType = "公式情報" | "公式販売" | "小売販売" | "アフィリエイト";

export type SourceLink = {
  label: string;
  url: string;
  type: LinkType;
};

export type RevisionEntry = {
  date: string;
  summary: string;
};

export type UseCaseVerdict = {
  useCase: string;
  verdict: Verdict;
  note: string;
};

export type SoftwareRecord = {
  id: string;
  slug: string;
  name: string;
  developer: string;
  category: "動画編集" | "日本語音声合成・TTS";
  supportedPlatforms: string[];
  plans: string[];
  useCases: UseCaseVerdict[];
  commercialUseStatus: UseCaseVerdict;
  attributionRequirement: string;
  clientDeliveryStatus: UseCaseVerdict;
  gameEmbeddingStatus: UseCaseVerdict;
  outputFormats: string[];
  batchExport: string;
  projectPortability: string;
  offlineAvailability: string;
  verdict: Verdict;
  summary: string;
  conditions: string[];
  limitations: string[];
  evidenceType: EvidenceType;
  verifiedAt: string;
  sourceUrls: SourceLink[];
  revisionHistory: RevisionEntry[];
};

export type SetupRecord = {
  id: string;
  slug: string;
  title: string;
  useCase: string;
  hostDevice: string;
  osVersion: string;
  application: string;
  audioInterface: string;
  microphone: string;
  adapters: string[];
  powerMethod: string;
  signalRoute: string[];
  inputChannels: string;
  stereoSupport: string;
  loopbackSupport: string;
  monitoringSupport: string;
  verdict: Verdict;
  summary: string;
  conditions: string[];
  knownLimitations: string[];
  unknowns: string[];
  evidenceType: EvidenceType;
  testMethod: string;
  testedAt: string;
  sourceUrls: SourceLink[];
  revisionHistory: RevisionEntry[];
};
