export type SourceType = "statuspage_json" | "github_release_json" | "official_terms_html";
export type SourceHealth = "healthy" | "stale" | "fetch_failed" | "disabled" | "unknown";
export type FetchStatus = "success" | "not_modified" | "error";
export type Materiality = "cosmetic" | "factual_noncritical" | "compatibility_relevant" | "commercial_terms_relevant" | "potentially_breaking";
export type ReviewStatus = "auto_applied" | "pending" | "approved" | "rejected" | "superseded";

export type SourceDefinition = {
  id: string;
  entityId: string;
  title: string;
  url: string;
  sourceType: SourceType;
  publisher: string;
  officialStatus: "official";
  retrievalMethod: "statuspage_api" | "github_releases_api" | "official_html_text_hash";
  monitoringCadenceSeconds: number;
  staleAfterSeconds: number;
  applicableFields: string[];
  locale: string;
  enabled: boolean;
  autoApply: boolean;
};

export type ConditionalState = {
  etag?: string | null;
  lastModified?: string | null;
  contentHash?: string | null;
  extractedFields?: Record<string, unknown> | null;
};

export type ObservationReceipt = {
  url: string;
  contentType: string | null;
  cacheControl: string | null;
  etag: string | null;
  lastModified: string | null;
  error?: string;
};

export type FetchObservation = {
  fetchStatus: FetchStatus;
  httpStatus: number | null;
  observedAt: string;
  extractedFields: Record<string, unknown> | null;
  contentHash: string | null;
  extractionConfidence: "high" | "medium" | "none";
  parserVersion: string;
  receipt: ObservationReceipt;
};

export type ChangeDescriptor = {
  changedFields: string[];
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  materiality: Materiality;
  reviewStatus: ReviewStatus;
  reason: string | null;
  requiredAction: string | null;
};

export const SOURCE_REGISTRY: readonly SourceDefinition[] = [
  {
    id: "twitch-status",
    entityId: "setup-ag03-ipad-usbc",
    title: "Twitch 配信サービス状態",
    url: "https://status.twitch.com/api/v2/status.json",
    sourceType: "statuspage_json",
    publisher: "Twitch",
    officialStatus: "official",
    retrievalMethod: "statuspage_api",
    monitoringCadenceSeconds: 30 * 60,
    staleAfterSeconds: 2 * 60 * 60,
    applicableFields: ["officialStatus", "statusDescription", "checkedAt"],
    locale: "en",
    enabled: true,
    autoApply: true,
  },
  {
    id: "obs-studio-releases",
    entityId: "sw-obs-studio",
    title: "OBS Studio 最新リリース",
    url: "https://api.github.com/repos/obsproject/obs-studio/releases/latest",
    sourceType: "github_release_json",
    publisher: "OBS Project",
    officialStatus: "official",
    retrievalMethod: "github_releases_api",
    monitoringCadenceSeconds: 12 * 60 * 60,
    staleAfterSeconds: 48 * 60 * 60,
    applicableFields: ["version", "releaseDate", "sourceUrl", "checkedAt"],
    locale: "en",
    enabled: true,
    autoApply: true,
  },
  {
    id: "voicevox-releases",
    entityId: "sw-voicevox",
    title: "VOICEVOX 最新リリース",
    url: "https://api.github.com/repos/VOICEVOX/voicevox/releases/latest",
    sourceType: "github_release_json",
    publisher: "VOICEVOX",
    officialStatus: "official",
    retrievalMethod: "github_releases_api",
    monitoringCadenceSeconds: 12 * 60 * 60,
    staleAfterSeconds: 48 * 60 * 60,
    applicableFields: ["version", "releaseDate", "sourceUrl", "checkedAt"],
    locale: "ja",
    enabled: true,
    autoApply: true,
  },
  {
    id: "voicevox-software-terms",
    entityId: "sw-voicevox",
    title: "VOICEVOX ソフトウェア利用規約",
    url: "https://voicevox.hiroshiba.jp/term/",
    sourceType: "official_terms_html",
    publisher: "VOICEVOX",
    officialStatus: "official",
    retrievalMethod: "official_html_text_hash",
    monitoringCadenceSeconds: 7 * 24 * 60 * 60,
    staleAfterSeconds: 14 * 24 * 60 * 60,
    applicableFields: ["documentHash", "checkedAt"],
    locale: "ja",
    enabled: true,
    autoApply: false,
  },
] as const;

export async function fetchOfficialSource(
  source: SourceDefinition,
  previous: ConditionalState = {},
  fetchImpl: typeof fetch = fetch,
  now = new Date(),
  timeoutMs = 8_000,
): Promise<FetchObservation> {
  const headers = new Headers({
    Accept: source.sourceType === "official_terms_html" ? "text/html,application/xhtml+xml" : "application/json",
    "User-Agent": "CreatorStackLab-Observatory/1.0",
  });
  if (source.sourceType === "github_release_json") headers.set("X-GitHub-Api-Version", "2022-11-28");
  if (previous.etag) headers.set("If-None-Match", previous.etag);
  if (previous.lastModified) headers.set("If-Modified-Since", previous.lastModified);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    const response = await fetchImpl(source.url, { headers, signal: controller.signal, redirect: "follow" });
    const receipt = makeReceipt(source.url, response.headers);
    if (response.status === 304) {
      return {
        fetchStatus: "not_modified",
        httpStatus: 304,
        observedAt: now.toISOString(),
        extractedFields: previous.extractedFields ?? null,
        contentHash: previous.contentHash ?? null,
        extractionConfidence: previous.extractedFields ? "high" : "none",
        parserVersion: parserVersion(source.sourceType),
        receipt,
      };
    }
    if (!response.ok) throw new Error(`http_${response.status}`);

    const body = await response.text();
    const normalized = normalizeOfficialPayload(source, body);
    return {
      fetchStatus: "success",
      httpStatus: response.status,
      observedAt: now.toISOString(),
      extractedFields: normalized.extractedFields,
      contentHash: await sha256(normalized.contentBasis),
      extractionConfidence: normalized.confidence,
      parserVersion: parserVersion(source.sourceType),
      receipt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch_error";
    return {
      fetchStatus: "error",
      httpStatus: message.startsWith("http_") ? Number(message.slice(5)) : null,
      observedAt: now.toISOString(),
      extractedFields: null,
      contentHash: null,
      extractionConfidence: "none",
      parserVersion: parserVersion(source.sourceType),
      receipt: {
        url: source.url,
        contentType: null,
        cacheControl: null,
        etag: null,
        lastModified: null,
        error: message.toLowerCase().includes("abort") || message === "timeout" ? "timeout" : message,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeOfficialPayload(source: SourceDefinition, body: string): {
  extractedFields: Record<string, unknown>;
  contentBasis: string;
  confidence: "high" | "medium";
} {
  if (source.sourceType === "statuspage_json") {
    const value = parseJson(body);
    const status = object(value.status);
    const page = object(value.page);
    const indicator = requiredString(status.indicator, "status.indicator");
    const mapped = mapStatuspageIndicator(indicator);
    const extractedFields = {
      officialStatus: mapped,
      statusDescription: requiredString(status.description, "status.description"),
      publisherUpdatedAt: optionalString(page.updated_at),
      sourceUrl: optionalString(page.url) ?? source.url.replace(/\/api\/v2\/status\.json$/, ""),
    };
    return { extractedFields, contentBasis: stableJson(extractedFields), confidence: "high" };
  }

  if (source.sourceType === "github_release_json") {
    const value = parseJson(body);
    if (value.draft === true || value.prerelease === true) throw new Error("release_not_stable");
    const extractedFields = {
      version: requiredString(value.tag_name, "tag_name"),
      releaseDate: requiredString(value.published_at, "published_at"),
      sourceUrl: requiredString(value.html_url, "html_url"),
      releaseName: optionalString(value.name) ?? requiredString(value.tag_name, "tag_name"),
    };
    return { extractedFields, contentBasis: stableJson(extractedFields), confidence: "high" };
  }

  const normalizedText = normalizeHtmlText(body);
  if (normalizedText.length < 80) throw new Error("terms_document_too_short");
  const headingMatch = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const extractedFields = {
    documentKind: "software_terms",
    heading: headingMatch ? normalizeHtmlText(headingMatch[1]) : source.title,
    normalizedTextLength: normalizedText.length,
    hashScope: "visible_text",
  };
  return { extractedFields, contentBasis: normalizedText, confidence: "medium" };
}

export function describeChange(
  source: SourceDefinition,
  previousFields: Record<string, unknown>,
  nextFields: Record<string, unknown>,
): ChangeDescriptor | null {
  const keys = source.sourceType === "official_terms_html"
    ? ["documentHash"]
    : Array.from(new Set([...Object.keys(previousFields), ...Object.keys(nextFields)]));
  const comparablePrevious = source.sourceType === "official_terms_html" ? previousFields : previousFields;
  const comparableNext = source.sourceType === "official_terms_html" ? nextFields : nextFields;
  const changedFields = keys.filter((key) => stableJson(comparablePrevious[key]) !== stableJson(comparableNext[key]));
  if (!changedFields.length) return null;

  if (!source.autoApply) {
    return {
      changedFields,
      previousValues: pick(comparablePrevious, changedFields),
      newValues: pick(comparableNext, changedFields),
      materiality: "commercial_terms_relevant",
      reviewStatus: "pending",
      reason: "公式利用規約の正規化本文ハッシュが変化しました。意味・適用範囲は自動断定しません。",
      requiredAction: "公式原文を比較し、権利・表示・納品条件への影響を人が確認する",
    };
  }

  const nextStatus = nextFields.officialStatus;
  const riskyStatus = typeof nextStatus === "string" && !["operational", "unknown"].includes(nextStatus);
  return {
    changedFields,
    previousValues: pick(comparablePrevious, changedFields),
    newValues: pick(comparableNext, changedFields),
    materiality: riskyStatus ? "potentially_breaking" : "factual_noncritical",
    reviewStatus: "auto_applied",
    reason: null,
    requiredAction: null,
  };
}

export function evaluateOutcome(previousHash: string | null | undefined, observation: FetchObservation) {
  if (observation.fetchStatus === "error") return "failure" as const;
  if (observation.fetchStatus === "not_modified") return "unchanged" as const;
  if (!previousHash) return "initial" as const;
  return previousHash === observation.contentHash ? "unchanged" as const : "changed" as const;
}

export function isStale(lastSuccessfulFetchAt: string | null, staleAfterSeconds: number, now = new Date()) {
  if (!lastSuccessfulFetchAt) return true;
  return now.getTime() - new Date(lastSuccessfulFetchAt).getTime() > staleAfterSeconds * 1000;
}

export function nextDueAt(lastCheckedAt: string | null, cadenceSeconds: number) {
  if (!lastCheckedAt) return null;
  return new Date(new Date(lastCheckedAt).getTime() + cadenceSeconds * 1000).toISOString();
}

export function transitionKey(sourceId: string, previousHash: string, nextHash: string) {
  return `${sourceId}:${previousHash.slice(0, 16)}:${nextHash.slice(0, 16)}`;
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function normalizeHtmlText(value: string) {
  return decodeEntities(value
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function parserVersion(type: SourceType) {
  return type === "statuspage_json" ? "statuspage-v1" : type === "github_release_json" ? "github-release-v1" : "official-terms-text-v1";
}

function makeReceipt(url: string, headers: Headers): ObservationReceipt {
  return {
    url,
    contentType: headers.get("content-type"),
    cacheControl: headers.get("cache-control"),
    etag: headers.get("etag"),
    lastModified: headers.get("last-modified"),
  };
}

function parseJson(body: string): Record<string, unknown> {
  let value: unknown;
  try { value = JSON.parse(body); } catch { throw new Error("malformed_json"); }
  return object(value);
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("unexpected_payload_shape");
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, name: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`missing_${name}`);
  return value;
}

function optionalString(value: unknown) { return typeof value === "string" && value.trim() ? value : null; }

function mapStatuspageIndicator(value: string) {
  const map: Record<string, string> = { none: "operational", minor: "degraded", major: "partial_outage", critical: "major_outage", maintenance: "maintenance" };
  return map[value] ?? "unknown";
}

function stableJson(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function pick(value: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, value[key] ?? null]));
}

function decodeEntities(value: string) {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return named[entity.toLowerCase()] ?? `&${entity};`;
  });
}
