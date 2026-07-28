# Q Zone Guided Inspection Capture — Schema v2 (IPM-aligned)

Builds on `qzone-guided-flow-spec.md`. Each `inspection_point` now captures IPM-aligned data instead of a flat clean/issue flag:

- **Identification** — specific pest species when applicable (ties to training material: German vs American cockroach, etc.)
- **Threshold / activity level** — none · light · moderate · heavy (matches real report language: "light cockroach activity," "low fly catch count")
- **Conducive condition** — sanitation/exclusion gap that invites pests, tracked separately from the pest finding itself (e.g. "one socket found open," moisture, food debris)
- **Action tier** — which IPM response level was used: monitor only · exclusion/sanitation fix · targeted treatment · escalation
- **Recommendation** — auto-suggested based on threshold + action tier, editable

## Updated `inspection_point` schema

```json
{
  "point_id": "string",
  "label": "string",
  "outcome": "clean | issue",
  "identification": {
    "pest_type": "cockroach_german | cockroach_american | rodent | fly | ant | other | null",
    "evidence": "live_activity | droppings | damage | nesting | egg_cases | null"
  },
  "threshold_level": "none | light | moderate | heavy",
  "conducive_condition": {
    "present": "boolean",
    "type": "moisture | food_debris | clutter | structural_gap | not_sealed | dirty | null"
  },
  "action_tier": "monitor | exclusion_sanitation | targeted_treatment | escalation",
  "note": "string | null",
  "photo_ids": ["string"],
  "phrase_clean": "string (report sentence when outcome=clean)",
  "phrase_issue": "string (report sentence template, {pest_type}/{threshold_level}/{conducive_condition} substitutable)"
}
```

## Example — Cooking Area / Fryers, populated

```json
{
  "point_id": "fryers",
  "label": "Chips fryer / chicken fryers",
  "outcome": "issue",
  "identification": {
    "pest_type": "cockroach_german",
    "evidence": "live_activity"
  },
  "threshold_level": "light",
  "conducive_condition": {
    "present": true,
    "type": "food_debris"
  },
  "action_tier": "targeted_treatment",
  "note": "Light activity behind fryer unit, food debris accumulation noted",
  "photo_ids": ["p_0231"],
  "phrase_clean": "The chips fryer and chicken fryers were found to be clean, with no excessive or overstayed oil surfaces observed.",
  "phrase_issue": "Light {pest_type} activity was recorded near the fryer units, associated with {conducive_condition}. Targeted treatment was applied."
}
```

## Area-level roll-up (unchanged structure, now richer inputs)

```json
{
  "area_id": "cooking",
  "inspection_points": [ /* as above, IPM-structured */ ],
  "treatment_applied": "preventive | corrective | none",
  "overall_threshold": "derived: highest threshold_level among this area's inspection points",
  "recommendation": "auto-suggested from threshold_level + action_tier combinations, editable"
}
```

## Recommendation auto-suggestion logic (example rule set)

| Threshold | Action tier | Auto-suggested recommendation |
|---|---|---|
| none | monitor | No recommendation needed |
| light | monitor | Continue monitoring; no treatment needed yet |
| light | targeted_treatment | Monitor closely following treatment to confirm resolution |
| moderate | targeted_treatment | Schedule follow-up visit to reassess treated area |
| heavy | targeted_treatment / escalation | Escalate to supervisor; corrective treatment plan required |

## Why this matters beyond data quality

This is what turns the system from a QA/reporting fix into something that reflects real pest control expertise:
- **Identification** ties directly to the training material (species-specific biology already documented there)
- **Threshold levels** make severity comparable over time per site/area — the basis for the follow-up-frequency and pest-behavior analytics already planned
- **Conducive condition tracked separately from the pest finding** lets the system eventually correlate root causes with recurrence (e.g. "food debris conditions precede fryer-area cockroach activity in 80% of flagged visits") — a genuinely differentiated insight Insectram could never surface
- **Action tier** encodes the IPM hierarchy itself (prevent/exclude before treat, treat before escalate) directly into the data, not just as a training concept
