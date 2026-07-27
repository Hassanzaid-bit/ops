"use client";

import { SearchableSelect } from "@/components/SearchableSelect";

type ChipProps = {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

export function Chip({ label, selected, onClick, disabled }: ChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "min-h-10 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
        "active:scale-[0.98] disabled:opacity-40",
        selected
          ? "border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] ring-1 ring-[var(--accent)]"
          : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--ink-muted)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

type ChipGroupProps = {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  multi?: boolean;
  /** Force searchable UI; default auto when options >= 8 */
  searchable?: boolean | "auto";
  placeholder?: string;
  groups?: { label: string; options: string[] }[];
};

const SEARCH_THRESHOLD = 8;

export function ChipGroup({
  options,
  selected,
  onChange,
  multi = true,
  searchable = "auto",
  placeholder,
  groups,
}: ChipGroupProps) {
  const useSearch =
    searchable === true ||
    (searchable === "auto" && options.length >= SEARCH_THRESHOLD);

  if (useSearch) {
    return (
      <SearchableSelect
        options={options}
        selected={selected}
        onChange={onChange}
        multi={multi}
        placeholder={placeholder ?? "Search and select…"}
        groups={groups}
      />
    );
  }

  function toggle(option: string) {
    if (multi) {
      onChange(
        selected.includes(option)
          ? selected.filter((s) => s !== option)
          : [...selected, option],
      );
    } else {
      onChange(selected[0] === option ? [] : [option]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Chip
          key={option}
          label={option}
          selected={selected.includes(option)}
          onClick={() => toggle(option)}
        />
      ))}
    </div>
  );
}
