"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type Props = {
  open: boolean;
  areas: { name: string; done: boolean }[];
  onClose: () => void;
  onSelect: (area: string) => void;
};

export function AreaPickerModal({ open, areas, onClose, onSelect }: Props) {
  const titleId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter((a) => a.name.toLowerCase().includes(q));
  }, [areas, query]);

  const remaining = areas.filter((a) => !a.done).length;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = window.setTimeout(() => searchRef.current?.focus(), 50);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[var(--ink)]/45"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(85vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
      >
        <div className="border-b border-[var(--line)] px-3 pb-2.5 pt-3">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <h2
                id={titleId}
                className="text-base font-semibold text-[var(--ink)]"
              >
                Choose area
              </h2>
              <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
                {remaining} remaining · search or tap any area
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-9 rounded-lg px-2 text-sm font-semibold text-[var(--ink-muted)]"
            >
              Close
            </button>
          </div>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search areas (e.g. Grease Trap, FCU)…"
            className="min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)]"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--ink-muted)]">
              No matches for “{query.trim()}”
            </p>
          ) : (
            filtered.map((a) => (
              <button
                key={a.name}
                type="button"
                onClick={() => onSelect(a.name)}
                className={[
                  "flex min-h-11 w-full items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-2.5 text-left text-sm last:border-0",
                  a.done
                    ? "bg-[var(--ok-soft)]/60 text-[var(--ink)]"
                    : "text-[var(--ink)] active:bg-[var(--bg)]",
                ].join(" ")}
              >
                <span className="font-medium">{a.name}</span>
                <span
                  className={[
                    "shrink-0 text-sm font-semibold",
                    a.done ? "text-[var(--ok)]" : "text-[var(--ink-muted)]",
                  ].join(" ")}
                >
                  {a.done ? "Done ✓" : "Open"}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
