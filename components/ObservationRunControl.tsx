"use client";

import { useState } from "react";
import type { ObservationRunView } from "../data/models";
import { OBSERVATION_REFRESH_EVENT } from "./useObservationSnapshot";

export function ObservationRunControl({ lastRun }: { lastRun?: ObservationRunView }) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setMessage(null);
    try {
      const response = await fetch("/api/observations/run", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      const payload = await response.json() as { error?: string; run?: ObservationRunView };
      if (!response.ok || !payload.run) throw new Error(payload.error ?? `run_${response.status}`);
      const run = payload.run;
      setMessage(`完了：成功 ${run.successCount}・変更 ${run.changedCount}・不変 ${run.unchangedCount}・失敗 ${run.failureCount}`);
      window.dispatchEvent(new Event(OBSERVATION_REFRESH_EVENT));
    } catch (reason) {
      setMessage(`実行できませんでした：${reason instanceof Error ? reason.message : "unknown_error"}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="run-control" aria-labelledby="run-control-heading">
      <div>
        <p className="section-kicker">OWNER-ONLY OBSERVATION RUN</p>
        <h2 id="run-control-heading">公式ソースをいま確認</h2>
        <p>定期実行は装っていません。Twitchは30分、リリースは12時間、規約は7日を確認目標にした手動実行です。</p>
        {lastRun && <small>前回 {formatMoment(lastRun.finishedAt ?? lastRun.startedAt)} ・ {lastRun.status} ・ 成功 {lastRun.successCount}/{lastRun.sourceCount}</small>}
        {message && <p className="run-message" aria-live="polite">{message}</p>}
      </div>
      <button className="primary-button" type="button" onClick={run} disabled={running}>{running ? "取得・比較中…" : "観測を実行"}</button>
    </section>
  );
}

function formatMoment(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
}
