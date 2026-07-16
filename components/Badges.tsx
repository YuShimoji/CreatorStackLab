import type { EvidenceType, Verdict } from "../data/models";

const symbols: Record<Verdict, string> = { 適合: "✓", 条件付き適合: "△", 不適合: "×", 未確認: "?" };

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <span className={`verdict verdict-${verdict}`}><span aria-hidden="true">{symbols[verdict]}</span>{verdict}</span>;
}

export function EvidenceBadge({ evidence }: { evidence: EvidenceType }) {
  return <span className="evidence-badge"><span aria-hidden="true">▣</span>{evidence}</span>;
}
