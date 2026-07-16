"use client";

import { useMyStack } from "./MyStackProvider";

export function StackToggleButton({ id, compact = false }: { id: string; compact?: boolean }) {
  const { has, toggle, ready } = useMyStack();
  const saved = has(id);
  return (
    <button
      className={`stack-toggle${compact ? " stack-toggle-compact" : ""}${saved ? " is-saved" : ""}`}
      type="button"
      onClick={() => toggle(id)}
      disabled={!ready}
      aria-pressed={saved}
      data-testid={`stack-toggle-${id}`}
    >
      {saved ? "✓ My Stackから外す" : "+ My Stackに追加"}
    </button>
  );
}
