/**
 * Inspection points nested under checklist areas (schema v2).
 * Most areas start with one primary point; richer areas get sub-points.
 */

export type PointTemplate = {
  pointId: string;
  label: string;
  phraseClean: string;
  phraseIssue: string;
};

function point(
  pointId: string,
  label: string,
  phraseClean: string,
  phraseIssue: string,
): PointTemplate {
  return { pointId, label, phraseClean, phraseIssue };
}

function primary(area: string): PointTemplate {
  return point(
    "primary",
    area,
    `The ${area.toLowerCase()} was inspected and found clean, orderly, and well maintained.`,
    `Issue activity was recorded at the ${area.toLowerCase()}, associated with {conducive_condition}. {action_tier} response applied.`,
  );
}

/** Extra / override points for key areas — demonstrates nested capture */
const AREA_POINTS: Record<string, PointTemplate[]> = {
  "Grease Trap": [
    point(
      "trap_body",
      "Grease trap body",
      "The grease trap was inspected, cleaned, and found in satisfactory condition.",
      "Light {pest_type} activity / sanitation concern was noted at the grease trap body, associated with {conducive_condition}.",
    ),
    point(
      "covers",
      "Covers & seals",
      "Grease trap covers were intact, secure, and properly fitted.",
      "Grease trap cover / seal issue noted ({conducive_condition}).",
    ),
    point(
      "surrounds",
      "Surrounding floor",
      "The floor area around the grease trap was clean and free from accumulation.",
      "Accumulation around the grease trap was noted ({conducive_condition}), with {threshold_level} activity risk.",
    ),
  ],
  "Fly Control Units (FCUs)": [
    point(
      "units",
      "FCU units",
      "Fly control units were inspected and found operational and correctly positioned.",
      "{threshold_level} flying insect activity was recorded at FCU units ({evidence}).",
    ),
    point(
      "glue_boards",
      "Glue boards / inserts",
      "Glue boards were inspected and replaced as part of routine servicing.",
      "Glue board catch indicated {threshold_level} activity; boards were serviced.",
    ),
    point(
      "surrounds",
      "Surrounding hygiene",
      "Surrounding hygiene around FCUs supported effective fly control.",
      "Conducive conditions near FCUs ({conducive_condition}) may be supporting fly pressure.",
    ),
  ],
  "Manholes & Drainage Systems": [
    point(
      "manholes",
      "Manholes",
      "Accessible manholes were inspected and found clean and well maintained.",
      "Manhole concern noted with {threshold_level} risk ({conducive_condition}).",
    ),
    point(
      "drains",
      "Drain points & covers",
      "Drain covers were intact and secure; drainage points were free from debris.",
      "Drainage issue noted ({conducive_condition}); {action_tier} response applied.",
    ),
    point(
      "surrounds",
      "Surrounding floor",
      "Surrounding floor areas at drainage points were clean.",
      "Floor conditions at drainage ({conducive_condition}) require attention.",
    ),
  ],
  "Dry Goods Store": [
    point(
      "shelving",
      "Shelving & stock",
      "Shelving was organised with stock stored off the floor to facilitate inspection.",
      "Stock / shelving concern noted ({conducive_condition}).",
    ),
    point(
      "floor",
      "Floor & perimeter",
      "Floor and perimeter were clean with no harbourage observed.",
      "Floor / perimeter condition ({conducive_condition}) may support pest activity.",
    ),
    point(
      "packaging",
      "Packaging integrity",
      "No damaged packaging or pest-entry points in packaging were observed.",
      "Damaged packaging / exposure noted ({conducive_condition}).",
    ),
  ],
  "Trunking & Industrial Sockets": [
    point(
      "trunking",
      "Trunking",
      "Trunking was inspected and found secure with no openings of concern.",
      "Trunking opening / gap noted ({conducive_condition}).",
    ),
    point(
      "sockets",
      "Industrial sockets",
      "Industrial sockets were sealed and in satisfactory condition.",
      "Socket found open / not sealed ({conducive_condition}) — exclusion fix required.",
    ),
  ],
  "Toxic Bait Stations": [
    point(
      "stations",
      "Bait stations",
      "Toxic bait stations were inspected, serviced, and correctly positioned.",
      "Bait station concern or activity noted ({threshold_level}, {evidence}).",
    ),
    point(
      "bait",
      "Bait condition",
      "Bait was replenished and stations rearmed for monitoring.",
      "Bait take / condition requires reassessment ({threshold_level}).",
    ),
  ],
  "Non-Toxic Monitoring Devices": [
    point(
      "stations",
      "Monitoring stations",
      "Non-toxic monitoring stations were inspected and correctly positioned.",
      "Monitoring device activity noted ({threshold_level}, {evidence}).",
    ),
    point(
      "inserts",
      "Monitoring inserts",
      "Fresh monitoring inserts were fitted as part of routine servicing.",
      "Insert catch indicated {threshold_level} activity.",
    ),
  ],
};

/** Default inspection-point templates for a checklist area label */
export function getPointTemplates(area: string): PointTemplate[] {
  return AREA_POINTS[area] ?? [primary(area)];
}
