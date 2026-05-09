export interface TeamResults {
  carNumber: number;

  // Static
  passedTech?: string;
  designScore?: number;
  designPenalty?: number;
  costReportScore?: number;
  costPrototypeScore?: number;
  costPenalty?: number;
  bpScore?: number;
  bpPenalty?: number;

  // Dynamic
  accelerationTime?: number;
  tractionTime?: number;
  tractionDistance?: number;
  maneuverabilityTime?: number;
  specialtyTime?: number;
  specialtyDistance?: number;

  // Endurance
  enduranceLaps?: number;
  finishOrder?: number;
}

export interface FieldStats {
  accel: { tMin: number };
  traction:
    | { method: 1; dMin: number; dMax: number }
    | { method: 2; tMin: number }
    | { method: 3; tMin: number; courseLen: number };
  maneuv: { tMin: number };
  specialty:
    | { scoring: 'time'; tMin: number }
    | { scoring: 'distance'; dMin: number; dMax: number };
  endurance: { lMax: number; lMin: number };
}

export interface TeamScore {
  carNumber: number;

  passedTech: string | null;
  designScore: number | null;
  costScore: number | null;
  bpScore: number | null;
  staticTotal: number | null;

  accelerationScore: number | null;
  tractionScore: number | null;
  maneuverabilityScore: number | null;
  specialtyScore: number | null;
  enduranceScore: number | null;
  dynamicTotal: number | null;

  grandTotal: number | null;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

function scoreByTime(sMax: number, tRun: number, tMin: number, capMultiplier: number): number {
  const tMaxCap = tMin * capMultiplier;
  if (tRun > tMaxCap) return 0;
  return clamp((sMax * (tMaxCap - tRun)) / (tMaxCap - tMin), 0, sMax);
}

function scoreByDistance(sMax: number, dRun: number, dMin: number, dMax: number): number {
  if (dMax <= dMin) return 0;
  return clamp((sMax * (dRun - dMin)) / (dMax - dMin), 0, sMax);
}

//#region Static

function scoreDesign(t: TeamResults): number | null {
  if (t.designScore == null) {
    return null;
  }
  return Math.max(t.designScore - (t.designPenalty ?? 0), 0);
}

function scoreCost(t: TeamResults): number | null {
  if (t.costPrototypeScore == null && t.costReportScore == null) {
    return null;
  }
  const proto = clamp(t.costPrototypeScore ?? 0, 0, 85);
  const redux = clamp(t.costReportScore ?? 0, 0, 15);
  const penalty = t.costPenalty ?? 0;
  return Math.max(proto + redux - penalty, 0);
}

function scoreBP(t: TeamResults): number | null {
  if (t.bpScore == null) return null;
  return Math.max(clamp(t.bpScore, 0, 70) - (t.bpPenalty ?? 0), 0);
}

//#endregion

//#region Dynamic

function scoreAcceleration(t: TeamResults, f: FieldStats): number | null {
  if (t.accelerationTime == null || !f.accel.tMin) return null;
  return scoreByTime(70, t.accelerationTime, f.accel.tMin, 1.5);
}

function scoreTraction(t: TeamResults, f: FieldStats): number | null {
  switch (f.traction.method) {
    case 1:
      if (t.tractionDistance == null) return null;
      return scoreByDistance(70, t.tractionDistance, f.traction.dMin, f.traction.dMax);
    case 2:
      if (t.tractionTime == null || t.tractionTime === 0) return null;
      return scoreByTime(70, t.tractionTime, f.traction.tMin, 2.5);
    case 3: {
      const { tMin, courseLen } = f.traction;
      if (t.tractionTime != null && t.tractionTime > 0)
        return scoreByTime(70, t.tractionTime, tMin, 2.5);
      if (t.tractionDistance != null) {
        if (courseLen <= 0) return null;
        return clamp(
          70 * (t.tractionDistance / courseLen) * scoreByTime(70, tMin * 2.5, tMin, 2.5),
          0,
          35,
        );
      }
      return null;
    }
  }
}

function scoreManeuverability(t: TeamResults, f: FieldStats): number | null {
  if (t.maneuverabilityTime == null || !f.maneuv.tMin) return null;
  return scoreByTime(70, t.maneuverabilityTime, f.maneuv.tMin, 2.5);
}

function scoreSpecialty(t: TeamResults, f: FieldStats): number | null {
  if (f.specialty.scoring === 'time') {
    if (t.specialtyTime == null) return null;
    return scoreByTime(70, t.specialtyTime, f.specialty.tMin, 2.5);
  } else {
    if (t.specialtyDistance == null) return null;
    return scoreByDistance(70, t.specialtyDistance, f.specialty.dMin, f.specialty.dMax);
  }
}

function scoreEndurance(t: TeamResults, f: FieldStats, enduranceBonus: number): number | null {
  if (t.enduranceLaps == null) return null;
  const { lMax, lMin } = f.endurance;
  if (lMax === lMin) return 400 + enduranceBonus;
  return clamp((400 * (t.enduranceLaps - lMin)) / (lMax - lMin), 0, 400) + enduranceBonus;
}

//#region Endurance

function calcEnduranceBonuses(teams: TeamResults[], fieldStats: FieldStats): Map<number, number> {
  const lMax = fieldStats.endurance.lMax;
  const onLeadLap = teams
    .filter((t) => t.enduranceLaps === lMax && t.finishOrder != null)
    .sort((a, b) => (a.finishOrder ?? 0) - (b.finishOrder ?? 0));

  const N = Math.min(onLeadLap.length, 10);
  const bonuses = new Map<number, number>();
  onLeadLap.slice(0, 10).forEach((t, i) => bonuses.set(t.carNumber, N - i));
  return bonuses;
}

//#endregion

export function calcTeamScore(
  team: TeamResults,
  fieldStats: FieldStats,
  enduranceBonus: number,
): TeamScore {
  const design = scoreDesign(team);
  const cost = scoreCost(team);
  const bp = scoreBP(team);
  const staticTotal =
    design != null || cost != null || bp != null ? (design ?? 0) + (cost ?? 0) + (bp ?? 0) : null;
  const accel = scoreAcceleration(team, fieldStats);
  const traction = scoreTraction(team, fieldStats);
  const maneuv = scoreManeuverability(team, fieldStats);
  const specialty = scoreSpecialty(team, fieldStats);
  const endurance = scoreEndurance(team, fieldStats, enduranceBonus);
  const dynamicTotal =
    accel != null || traction != null || maneuv != null || specialty != null || endurance != null
      ? (accel ?? 0) + (traction ?? 0) + (maneuv ?? 0) + (specialty ?? 0) + (endurance ?? 0)
      : null;

  return {
    carNumber: team.carNumber,
    passedTech: team.passedTech ?? null,
    designScore: design,
    costScore: cost,
    bpScore: bp,
    staticTotal: staticTotal,
    accelerationScore: accel,
    tractionScore: traction,
    maneuverabilityScore: maneuv,
    specialtyScore: specialty,
    enduranceScore: endurance,
    dynamicTotal: dynamicTotal,
    grandTotal:
      staticTotal != null || dynamicTotal != null ? (staticTotal ?? 0) + (dynamicTotal ?? 0) : null,
  };
}

export function scoreAllTeams(teams: TeamResults[], fieldStats: FieldStats): TeamScore[] {
  const bonuses = calcEnduranceBonuses(teams, fieldStats);
  return teams
    .map((t) => calcTeamScore(t, fieldStats, bonuses.get(t.carNumber) ?? 0))
    .sort((a, b) => (b.grandTotal ?? -Infinity) - (a.grandTotal ?? -Infinity));
}
