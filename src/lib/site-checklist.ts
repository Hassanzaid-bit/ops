export type ChecklistSubArea = {
  id: string;
  name: string;
};

/** Top-level checklist area — not the future monitoring-station “department” tree */
export type ChecklistArea = {
  id: string;
  name: string;
  subAreas: ChecklistSubArea[];
};

function checklistId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Display label used in visit capture and records */
export function checklistItemLabel(area: string, subArea?: string): string {
  return subArea ? `${area} — ${subArea}` : area;
}

/** Flat list of capture targets for a branch checklist */
export function flattenChecklistLabels(areas: ChecklistArea[]): string[] {
  const out: string[] = [];
  for (const area of areas) {
    if (area.subAreas.length > 0) {
      for (const sub of area.subAreas) {
        out.push(checklistItemLabel(area.name, sub.name));
      }
    } else {
      out.push(area.name);
    }
  }
  return out;
}

export function checklistItemCount(areas: ChecklistArea[]): number {
  return flattenChecklistLabels(areas).length;
}

export function flatLabelsInclude(areas: ChecklistArea[], label: string): boolean {
  return flattenChecklistLabels(areas).includes(label);
}

/** Convert legacy flat area names to single-level checklist areas */
export function flatNamesToChecklistAreas(names: string[]): ChecklistArea[] {
  return names.map((name) => ({
    id: checklistId("area"),
    name,
    subAreas: [],
  }));
}

function isLegacyFlatAreas(raw: unknown): raw is string[] {
  return (
    Array.isArray(raw) &&
    raw.every((item) => typeof item === "string")
  );
}

function isChecklistAreaArray(raw: unknown): raw is ChecklistArea[] {
  return (
    Array.isArray(raw) &&
    raw.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as ChecklistArea).id === "string" &&
        typeof (item as ChecklistArea).name === "string" &&
        Array.isArray((item as ChecklistArea).subAreas),
    )
  );
}

/** Normalize DB JSON — supports legacy string[] or area → sub-area tree */
export function normalizeChecklistAreas(raw: unknown): ChecklistArea[] {
  if (isChecklistAreaArray(raw)) return raw;
  if (isLegacyFlatAreas(raw)) return flatNamesToChecklistAreas(raw);
  return [];
}

export function newChecklistArea(name: string): ChecklistArea {
  return { id: checklistId("area"), name, subAreas: [] };
}

export function newSubArea(name: string): ChecklistSubArea {
  return { id: checklistId("sub"), name };
}

/** Build a checklist tree from area names and optional sub-area names */
export function buildChecklistAreas(
  spec: { name: string; subAreas?: string[] }[],
): ChecklistArea[] {
  return spec.map(({ name, subAreas }) => ({
    id: checklistId("area"),
    name,
    subAreas: (subAreas ?? []).map((sub) => ({
      id: checklistId("sub"),
      name: sub,
    })),
  }));
}
