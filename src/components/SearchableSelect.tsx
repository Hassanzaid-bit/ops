"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SelectGroup = {
  label: string;
  options: string[];
};

type Props = {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  multi?: boolean;
  placeholder?: string;
  label?: string;
  /** Optional section headers (e.g. Cockroach → German / American) */
  groups?: SelectGroup[];
};

export function SearchableSelect({
  options,
  selected,
  onChange,
  multi = true,
  placeholder = "Search and select…",
  label,
  groups,
}: Props) {
  const listId = useId();
  const titleId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const filteredGroups = useMemo(() => {
    if (!groups?.length) return null;
    const q = query.trim().toLowerCase();
    return groups
      .map((g) => ({
        label: g.label,
        options: q
          ? g.options.filter((o) => o.toLowerCase().includes(q))
          : g.options,
      }))
      .filter((g) => g.options.length > 0);
  }, [groups, query]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 50);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function toggle(option: string) {
    if (multi) {
      onChange(
        selected.includes(option)
          ? selected.filter((s) => s !== option)
          : [...selected, option],
      );
    } else {
      // Single-select: always exactly one value (tap same again to clear)
      onChange(selected[0] === option ? [] : [option]);
      close();
    }
  }

  function clearSelected() {
    onChange([]);
  }

  const showList = filteredGroups ?? [{ label: "", options: filtered }];
  const empty =
    filteredGroups != null
      ? filteredGroups.length === 0
      : filtered.length === 0;

  const triggerLabel =
    selected.length === 0
      ? placeholder
      : multi
        ? `${selected.length} selected — tap to change`
        : selected[0];

  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-sm font-medium text-[var(--ink-muted)]">{label}</p>
      ) : null}

      {selected.length > 0 && multi && (
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-md border border-[var(--accent)] bg-[var(--surface)] px-2.5 py-1 text-left text-xs font-medium text-[var(--accent)] ring-1 ring-[var(--accent)]"
              title="Tap to remove"
            >
              <span className="truncate">{item}</span>
              <span aria-hidden className="opacity-70">
                ×
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={[
          "flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border px-3 text-left text-sm outline-none",
          selected.length
            ? "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]"
            : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)]",
          "focus:border-[var(--accent)]",
        ].join(" ")}
      >
        <span className="truncate">{triggerLabel}</span>
        <span className="shrink-0 text-sm text-[var(--ink-muted)]">▼</span>
      </button>

      {multi ? (
        <p className="text-xs text-[var(--ink-muted)]">
          {selected.length} of {options.length} selected
        </p>
      ) : null}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[var(--ink)]/45"
            onClick={close}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[min(85vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
          >
            <div className="border-b border-[var(--line)] px-3 pb-2.5 pt-3">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h2
                  id={titleId}
                  className="text-base font-semibold text-[var(--ink)]"
                >
                  {label ?? "Select"}
                </h2>
                <button
                  type="button"
                  onClick={close}
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
                placeholder="Type to search…"
                className="min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)]"
              />
              {multi && selected.length > 0 && (
                <button
                  type="button"
                  onClick={clearSelected}
                  className="mt-2 text-sm font-semibold text-[var(--ink-muted)]"
                >
                  Clear selection
                </button>
              )}
            </div>

            <div
              id={listId}
              role="listbox"
              aria-multiselectable={multi}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              {empty ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--ink-muted)]">
                  No matches for “{query.trim()}”
                </p>
              ) : (
                showList.map((group) => (
                  <div key={group.label || "all"}>
                    {group.label ? (
                      <p className="sticky top-0 bg-[var(--bg)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                        {group.label}
                      </p>
                    ) : null}
                    {group.options.map((option) => {
                      const isOn = selected[0] === option || (multi && selected.includes(option));
                      return (
                        <button
                          key={option}
                          type="button"
                          role="option"
                          aria-selected={isOn}
                          onClick={() => toggle(option)}
                          className={[
                            "flex min-h-11 w-full items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-2.5 text-left text-sm",
                            isOn
                              ? "bg-[var(--surface)] font-semibold text-[var(--accent)] ring-inset ring-1 ring-[var(--accent)]"
                              : "text-[var(--ink)] active:bg-[var(--bg)]",
                          ].join(" ")}
                        >
                          <span>{option}</span>
                          {isOn ? (
                            <span className="text-sm text-[var(--accent-deep)]">
                              {multi ? "✓" : "●"}
                            </span>
                          ) : (
                            !multi && (
                              <span className="text-sm text-[var(--line)]">○</span>
                            )
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {multi && (
              <div className="border-t border-[var(--line)] p-2.5">
                <button
                  type="button"
                  onClick={close}
                  className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--ink)] text-sm font-semibold text-[var(--bg)]"
                >
                  Done{selected.length ? ` (${selected.length})` : ""}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
