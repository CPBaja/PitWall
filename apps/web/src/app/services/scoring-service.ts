import { computed, inject, Injectable } from '@angular/core';
import { DataService } from './data-service';
import { CarOverrides, OverrideService } from './override-service';
import { CarData } from '../models/types';
import { FieldStats, scoreAllTeams, TeamResults, TeamScore } from '../models/scoring-models';

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

  const acceleration = bestRun(dynamicsData, 'Acceleration');
  const maneuverability = bestRun(dynamicsData, 'Maneuverability');
  const traction = bestRun(dynamicsData, 'Traction');
  const specialty = bestRun(dynamicsData, 'Rock Crawl');

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
    tractionTime: override.tractionTime ?? traction?.correctedTime ?? undefined,
    tractionDistance: override.tractionDist ?? traction?.distance.value ?? undefined,
    maneuverabilityTime:
      override.maneuverabilityTime ?? maneuverability?.correctedTime ?? undefined,
    specialtyTime: override.specialtyTime ?? specialty?.correctedTime ?? undefined,
    specialtyDistance: override.specialtyDist ?? specialty?.distance.value ?? undefined,

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

function deriveFieldStats(teams: TeamResults[]): FieldStats {
  const times = (getter: (t: TeamResults) => number | undefined) =>
    teams.map(getter).filter((t): t is number => t != null && t > 0);

  const accelTimes = times((t) => t.accelerationTime);
  const tractionTimes = times((t) => t.tractionTime);
  const tractionDists = times((t) => t.tractionDistance);
  const maneuvTimes = times((t) => t.maneuverabilityTime);
  const laps = times((t) => t.enduranceLaps);

  const completers = teams.filter((t) => t.tractionTime != null && t.tractionTime > 0);
  const nonCompleters = teams.filter(
    (t) => (t.tractionTime == null && t.tractionDistance != null) || t.tractionTime === 0,
  );
  const method = completers.length === 0 ? 1 : nonCompleters.length === 0 ? 2 : 3;

  const specCompleters = teams.filter((t) => t.specialtyTime != null && t.specialtyTime > 0);
  const specNonCompleters = teams.filter(
    (t) => t.specialtyDistance != null && (t.specialtyTime == null || t.specialtyTime === 0),
  );

  return {
    accel: { tMin: accelTimes.length ? Math.min(...accelTimes) : 0 },

    traction:
      method === 1
        ? { method: 1, dMin: 0, dMax: Math.max(0, ...tractionDists) }
        : method === 2
          ? { method: 2, tMin: Math.min(...tractionTimes) }
          : {
              method: 3,
              tMin: Math.min(...tractionTimes),
              courseLen: Math.max(0, ...tractionDists),
            },

    maneuv: { tMin: maneuvTimes.length ? Math.min(...maneuvTimes) : 0 },

    specialty:
      specCompleters.length === 0
        ? {
            scoring: 'distance',
            dMin: 0,
            dMax: Math.max(0, ...specNonCompleters.map((t) => t.specialtyDistance ?? 0)),
          }
        : { scoring: 'time', tMin: Math.min(...specCompleters.map((t) => t.specialtyTime!)) },

    endurance: {
      lMax: laps.length ? Math.max(...laps) : 0,
      lMin: laps.length ? Math.min(...laps) : 0,
    },
  };
}
