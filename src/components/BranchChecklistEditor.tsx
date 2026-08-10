"use client";

import { useState } from "react";
import type { Site } from "@/lib/types";
import type { ChecklistArea } from "@/lib/site-checklist";
import {
  checklistItemCount,
  newChecklistArea,
  newSubArea,
} from "@/lib/site-checklist";

type Props = {
  site: Site;
  onChange: (site: Site) => void;
};

export function BranchChecklistEditor({ site, onChange }: Props) {
  const [newAreaName, setNewAreaName] = useState("");
  const [newSubNames, setNewSubNames] = useState<Record<string, string>>({});

  const itemCount = checklistItemCount(site.checklistAreas);

  function updateAreas(areas: ChecklistArea[]) {
    onChange({ ...site, checklistAreas: areas });
  }

  function addArea(e: React.FormEvent) {
    e.preventDefault();
    const name = newAreaName.trim();
    if (!name) return;
    if (
      site.checklistAreas.some(
        (a) => a.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      return;
    }
    updateAreas([...site.checklistAreas, newChecklistArea(name)]);
    setNewAreaName("");
  }

  function removeArea(areaId: string) {
    updateAreas(site.checklistAreas.filter((a) => a.id !== areaId));
  }

  function renameArea(areaId: string, name: string) {
    updateAreas(
      site.checklistAreas.map((a) =>
        a.id === areaId ? { ...a, name: name.trim() } : a,
      ),
    );
  }

  function addSubArea(e: React.FormEvent, areaId: string) {
    e.preventDefault();
    const name = (newSubNames[areaId] ?? "").trim();
    if (!name) return;
    updateAreas(
      site.checklistAreas.map((a) => {
        if (a.id !== areaId) return a;
        if (a.subAreas.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
          return a;
        }
        return { ...a, subAreas: [...a.subAreas, newSubArea(name)] };
      }),
    );
    setNewSubNames((prev) => ({ ...prev, [areaId]: "" }));
  }

  function removeSubArea(areaId: string, subId: string) {
    updateAreas(
      site.checklistAreas.map((a) =>
        a.id === areaId
          ? { ...a, subAreas: a.subAreas.filter((s) => s.id !== subId) }
          : a,
      ),
    );
  }

  function renameSubArea(areaId: string, subId: string, name: string) {
    updateAreas(
      site.checklistAreas.map((a) =>
        a.id === areaId
          ? {
              ...a,
              subAreas: a.subAreas.map((s) =>
                s.id === subId ? { ...s, name: name.trim() } : s,
              ),
            }
          : a,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-[var(--ink)]">
          Checklist
        </h2>
        <span className="text-sm text-[var(--ink-muted)]">
          {itemCount} inspection item{itemCount === 1 ? "" : "s"}
        </span>
      </div>

      <p className="text-sm text-[var(--ink-muted)]">
        Add checklist areas (e.g. Front of house), then sub-areas under each
        (e.g. Lobby area). Technicians inspect at sub-area level when present.
      </p>

      <form onSubmit={addArea} className="flex flex-wrap gap-2">
        <input
          value={newAreaName}
          onChange={(e) => setNewAreaName(e.target.value)}
          placeholder="New checklist area (e.g. Back of house)"
          className={`${inputClass} min-w-[12rem] flex-1`}
        />
        <button
          type="submit"
          className="min-h-11 shrink-0 rounded-lg bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--bg)]"
        >
          + Add area
        </button>
      </form>

      <ul className="space-y-3">
        {site.checklistAreas.map((area) => (
          <li
            key={area.id}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={area.name}
                onChange={(e) => renameArea(area.id, e.target.value)}
                aria-label="Checklist area name"
                className={`${inputClass} min-w-[10rem] flex-1 font-medium`}
              />
              <button
                type="button"
                onClick={() => removeArea(area.id)}
                className="min-h-9 rounded-md px-2 text-sm font-semibold text-red-800"
              >
                Remove
              </button>
            </div>

            {area.subAreas.length > 0 && (
              <ul className="mt-3 space-y-2 border-l-2 border-[var(--line)] pl-4">
                {area.subAreas.map((sub) => (
                  <li key={sub.id} className="flex flex-wrap items-center gap-2">
                    <input
                      value={sub.name}
                      onChange={(e) =>
                        renameSubArea(area.id, sub.id, e.target.value)
                      }
                      aria-label="Sub-area name"
                      className={`${inputClass} min-w-[8rem] flex-1 text-sm`}
                    />
                    <button
                      type="button"
                      onClick={() => removeSubArea(area.id, sub.id)}
                      className="min-h-9 rounded-md px-2 text-xs font-semibold text-[var(--ink-muted)]"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form
              onSubmit={(e) => addSubArea(e, area.id)}
              className="mt-3 flex flex-wrap gap-2"
            >
              <input
                value={newSubNames[area.id] ?? ""}
                onChange={(e) =>
                  setNewSubNames((prev) => ({
                    ...prev,
                    [area.id]: e.target.value,
                  }))
                }
                placeholder="Add sub-area (e.g. Grease trap)"
                className={`${inputClass} min-w-[8rem] flex-1 text-sm`}
              />
              <button
                type="submit"
                className="min-h-9 rounded-lg border border-[var(--line)] px-3 text-xs font-semibold text-[var(--accent)]"
              >
                + Sub-area
              </button>
            </form>

            {area.subAreas.length === 0 && (
              <p className="mt-2 text-xs text-[var(--ink-muted)]">
                No sub-areas — this checklist area is inspected as one item.
              </p>
            )}
          </li>
        ))}

        {site.checklistAreas.length === 0 && (
          <li className="rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-[var(--ink-muted)]">
            No checklist areas yet. Add an area to build this branch checklist.
          </li>
        )}
      </ul>
    </div>
  );
}

const inputClass =
  "min-h-10 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-base outline-none focus:border-[var(--accent)]";
