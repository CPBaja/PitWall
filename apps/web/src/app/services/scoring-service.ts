import { computed, inject, Injectable } from '@angular/core';
import { DataService } from './data-service';
import { CarOverrides, OverrideService } from './override-service';
import { CarData, DynamicRun } from '../models/types';
import {
  FieldStats,
  scoreAllTeams,
  scoreHybridCompleterByTime,
  TeamResults,
  TeamScore,
} from '../models/scoring-models';

@Injectable({
  providedIn: 'root',
})
export class ScoringService {
  private data = inject(DataService);
  private overrides = inject(OverrideService);

  readonly teamResults = computed<TeamResults[]>(() => {
    const cars = this.data.cars();
    const overrideMap = this.overrides.overrides();

    if (cars.length === 0) {
      return [];
    }

    const finishOrders = resolveFinishOrder(cars, overrideMap);
    return cars.map((car) =>
      buildTeamResults(car, overrideMap.get(car.carNumber) ?? {}, finishOrders),
    );
  });

  readonly fieldStats = computed<FieldStats>(() => deriveFieldStats(this.teamResults()));

  readonly scores = computed<TeamScore[]>(() => {
    const teamResults = this.teamResults();

    if (teamResults.length === 0) {
      return [];
    }

    return scoreAllTeams(teamResults, this.fieldStats());
  });

  readonly scoreMap = computed(() => new Map(this.scores().map((s) => [Number(s.carNumber), s])));

  getScore(carNumber: number): TeamScore | undefined {
    return this.scoreMap().get(carNumber);
  }
}

function buildTeamResults(
  car: CarData,
  override: CarOverrides,
  finishOrders: Map<number, number>,
): TeamResults {
  const staticData = car.staticData;
  const dynamicsData = car.dynamicsData;
  const enduranceData = car.enduranceData;

  const specialtyRunMap: Map<string, { time?: number; distance?: number }> = new Map();

  const acceleration = bestRun(dynamicsData, 'Acceleration');
  const maneuverability = bestRun(dynamicsData, 'Maneuverability');
  // const traction = bestRun(dynamicsData, 'Traction');
  // const specialty = bestRun(dynamicsData, 'Rock Crawl');
  const specialtyRun = createSpecialtyMap(dynamicsData);
  specialtyRun?.forEach((run, eventName) =>
    specialtyRunMap.set(eventName, {
      time: run.correctedTime ?? undefined,
      distance: run.distance?.value ?? undefined,
    }),
  );

  return {
    carNumber: car.carNumber,

    passedTech: staticData?.passedTech ?? undefined,
    designScore: override.designScore ?? staticData?.designScore ?? undefined,
    designPenalty: override.designPenalty ?? staticData?.designPenalty ?? undefined,
    costReportScore: override.costReport ?? staticData?.costReport ?? undefined,
    costPrototypeScore: override.costPrototype ?? staticData?.costPrototype ?? undefined,
    costPenalty: override.costPenalty ?? staticData?.costPenalty ?? undefined,

    bpScore: override.bpScore ?? staticData?.bpScore ?? undefined,
    bpPenalty: override.bpPenalty ?? staticData?.bpPenalty ?? undefined,

    accelerationTime: override.accelerationTime ?? acceleration?.correctedTime ?? undefined,
    maneuverabilityTime:
      override.maneuverabilityTime ?? maneuverability?.correctedTime ?? undefined,

    specialtyRunMap: specialtyRunMap,

    enduranceLaps: override.enduranceLaps ?? enduranceData?.lapCount ?? undefined,
    finishOrder: finishOrders.get(car.carNumber) ?? undefined,
  };
}

function bestRun(data: CarData['dynamicsData'], eventName: string) {
  if (!data) {
    return null;
  }

  return data.runs.find((run) => run.event === eventName && run.position !== null) ?? null;
}

function createSpecialtyMap(data: CarData['dynamicsData']) {
  if (!data) {
    return null;
  }

  const specialtyMap = new Map<string, DynamicRun>();

  data.runs
    .filter(
      (run) =>
        !run.event?.toLowerCase().includes('accel') &&
        !run.event?.toLowerCase().includes('maneuv') &&
        run.position !== null,
    )
    .forEach((run) => {
      if (run.event) specialtyMap.set(run.event, run);
    });

  return specialtyMap;
}

function resolveFinishOrder(
  cars: CarData[],
  overrideMap: Map<number, CarOverrides>,
): Map<number, number> {
  const result = new Map<number, number>();

  for (const car of cars) {
    const pos = car.enduranceData?.position ?? null;
    if (pos !== null) {
      result.set(car.carNumber, pos);
    }
  }

  // Apply overrides, displacing any car at the claimed position downward
  for (const [carNumber, override] of overrideMap) {
    if (override.finishOrder === undefined) {
      continue;
    }
    const claimed = override.finishOrder;

    for (const [num, pos] of result) {
      if (num !== carNumber && pos >= claimed) {
        result.set(num, pos + 1);
      }
    }

    result.set(carNumber, claimed);
  }

  return result;
}

export function deriveFieldStats(teams: TeamResults[]): FieldStats {
  const times = (getter: (t: TeamResults) => number | undefined) =>
    teams.map(getter).filter((t): t is number => t != null && t > 0);
  const maxDistance = (getter: (t: TeamResults) => number | undefined, subset: TeamResults[]) =>
    Math.max(0, ...subset.map(getter).filter((d): d is number => d != null && d > 0));

  const accelTimes = times((t) => t.accelerationTime);
  const maneuvTimes = times((t) => t.maneuverabilityTime);
  const laps = times((t) => t.enduranceLaps);

  const specialty = new Map <
    string, 
    | { scoring: 'time'; tMin: number }
    | { scoring: 'distance'; dMin: number; dMax: number }
    | { scoring: 'hybrid'; tMin: number; courseLen: number; minCompleterScore: number }>();

  const eventNames = new Set<string>();

  for (const team of teams) {
    team.specialtyRunMap?.forEach((_, eventName) => eventNames.add(eventName));
  }

  for (const eventName of eventNames) {
    const runs = teams
      .map((team) => team.specialtyRunMap?.get(eventName))
      .filter((run): run is { time?: number; distance?: number } => run != null);

  const completers = runs.filter((run) => run.time != null && run.time > 0);
  const nonCompleters = runs.filter(
      (run) => run.distance != null && (run.time == null || run.time === 0),
    );

  const completerTimes = completers.map((run) => run.time!);
  const tMin = completerTimes.length ? Math.min(...completerTimes) : 0;

  if (completers.length === 0) {
    specialty.set(eventName, {
      scoring: 'distance',
        dMin: 0,
        dMax: Math.max(0, ...runs.map((run) => run.distance ?? 0)),
      });
    } else if (nonCompleters.length === 0) {
      specialty.set(eventName, {
        scoring: 'time',
        tMin,
      });
    } else {
      specialty.set(eventName, {
        scoring: 'hybrid',
        tMin,
        courseLen: Math.max(0, ...completers.map((run) => run.distance ?? 0)),
        minCompleterScore: minCompleterScoreByTime(completerTimes, tMin, 70),
      });
    }
  }

  return {
    accel: { tMin: accelTimes.length ? Math.min(...accelTimes) : 0 },

    maneuv: { tMin: maneuvTimes.length ? Math.min(...maneuvTimes) : 0 },

    specialty,

    endurance: {
      lMax: laps.length ? Math.max(...laps) : 0,
      lMin: laps.length ? Math.min(...laps) : 0,
    },
  };
}

function minCompleterScoreByTime(times: number[], tMin: number, sMax: number): number {
  if (!times.length || tMin <= 0) {
    return 0;
  }
  return Math.min(...times.map((time) => scoreHybridCompleterByTime(sMax, time, tMin)));
}
