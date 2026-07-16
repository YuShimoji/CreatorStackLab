"use client";

import { useCallback, useEffect, useState } from "react";
import type { ObservationSnapshot } from "../data/models";

export const OBSERVATION_REFRESH_EVENT = "creator-stack-observation-refresh";

export function useObservationSnapshot() {
  const [snapshot, setSnapshot] = useState<ObservationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/observations/snapshot", { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json() as ObservationSnapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? `snapshot_${response.status}`);
      setSnapshot(payload);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "観測データを取得できませんでした");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const listener = () => void refresh();
    window.addEventListener(OBSERVATION_REFRESH_EVENT, listener);
    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener(OBSERVATION_REFRESH_EVENT, listener);
    };
  }, [refresh]);

  return { snapshot, loading, error, refresh };
}
