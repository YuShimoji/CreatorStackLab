"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const STACK_KEY = "creator-stack-lab:my-stack:v1";
const VISIT_KEY = "creator-stack-lab:last-visit:v1";

type MyStackContextValue = {
  ids: string[];
  ready: boolean;
  previousVisit: string | null;
  has: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
};

const MyStackContext = createContext<MyStackContextValue | null>(null);

function readIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STACK_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch { return []; }
}

export function MyStackProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [previousVisit, setPreviousVisit] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setIds(readIds());
    setPreviousVisit(localStorage.getItem(VISIT_KEY));
    localStorage.setItem(VISIT_KEY, new Date().toISOString());
    setReady(true);
  }, []);

  const update = useCallback((next: (current: string[]) => string[]) => {
    setIds((current) => {
      const value = Array.from(new Set(next(current)));
      localStorage.setItem(STACK_KEY, JSON.stringify(value));
      return value;
    });
  }, []);
  const add = useCallback((id: string) => update((current) => [...current, id]), [update]);
  const remove = useCallback((id: string) => update((current) => current.filter((value) => value !== id)), [update]);
  const toggle = useCallback((id: string) => update((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]), [update]);
  const value = useMemo(() => ({ ids, ready, previousVisit, has: (id: string) => ids.includes(id), add, remove, toggle }), [ids, ready, previousVisit, add, remove, toggle]);
  return <MyStackContext.Provider value={value}>{children}</MyStackContext.Provider>;
}

export function useMyStack() {
  const value = useContext(MyStackContext);
  if (!value) throw new Error("useMyStack must be used within MyStackProvider");
  return value;
}
