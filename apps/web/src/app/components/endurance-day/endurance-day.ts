import { Component, computed, inject, input, signal } from '@angular/core';
import { DataService } from '../../services/data-service';
import { ScoringService } from '../../services/scoring-service';
import { OverrideService } from '../../services/override-service';
import { CarPanelComponent } from '../car-panel/car-panel';
import { CarData, LapRecord } from '../../models/types';
import { TeamScore } from '../../models/scoring-models';

interface EnduranceRow {
  carNumber: number;
  teamName: string;
  car: CarData | null;
  score: TeamScore | null;
  laps: number | null;
  position: number | null;
  bestLapTime: number | null;
  bestLapNumber: number | null;
  hasOverrides: boolean;
}

interface LapGroup {
  key: string;
  lapCount: number | null;
  rows: EnduranceRow[];
}

interface BestLap {
  lapNumber: number | null;
  lapTime: number | null;
}

@Component({
  selector: 'pw-endurance-day',
  standalone: true,
  imports: [CarPanelComponent],
  host: { class: 'contents' },
  templateUrl: './endurance-day.html',
})
export class EnduranceDayComponent {
  carNum = input.required<string>();
  myCarNumber = computed(() => +this.carNum());

  private data = inject(DataService);
  private scoring = inject(ScoringService);
  private overrides = inject(OverrideService);

  readonly raceContext = this.data.raceContext;
  readonly carMap = this.data.carMap;
  readonly selectedCar = signal<number | null>(null);

  readonly rows = computed<EnduranceRow[]>(() => {
    const carMap = this.carMap();
    const scoreMap = this.scoring.scoreMap();
    const overriddenCars = this.overrides.overriddenCars();

    return this.scoring
      .teamResults()
      .map((team) => {
        const car = carMap.get(team.carNumber) ?? null;
        const endurance = car?.enduranceData ?? null;
        const bestLap = findBestLap(endurance?.laps ?? [], endurance?.bestLapTime ?? null);
        const score = scoreMap.get(team.carNumber) ?? null;
        const laps = team.enduranceLaps ?? null;
        const position = team.finishOrder ?? null;
        const bestLapTime = endurance?.bestLapTime ?? bestLap?.lapTime ?? null;

        return {
          carNumber: team.carNumber,
          teamName: car?.teamName ?? '—',
          car,
          score,
          laps,
          position,
          bestLapTime,
          bestLapNumber: bestLap?.lapNumber ?? null,
          hasOverrides: overriddenCars.has(team.carNumber),
        };
      })
      .filter(
        (row) =>
          row.laps != null ||
          row.position != null ||
          row.bestLapTime != null ||
          row.score?.enduranceScore != null ||
          row.hasOverrides,
      )
      .sort(compareEnduranceRows);
  });

  readonly lapGroups = computed<LapGroup[]>(() => {
    const groups: LapGroup[] = [];

    for (const row of this.rows()) {
      const key = row.laps == null ? 'no-laps' : String(row.laps);
      let group = groups[groups.length - 1];

      if (!group || group.key !== key) {
        group = { key, lapCount: row.laps, rows: [] };
        groups.push(group);
      }

      group.rows.push(row);
    }

    return groups;
  });

  onCarClick(carNumber: number) {
    this.selectedCar.update((cur) => (cur === carNumber ? null : carNumber));
  }

  rowClass(carNumber: number, firstInGroup: boolean): string {
    const groupBorder = firstInGroup ? ' border-t border-line' : '';

    if (carNumber === this.myCarNumber()) {
      const selected = carNumber === this.selectedCar() ? ' border-l-2 border-l-accent' : '';
      return `sticky top-8 bottom-0 z-10 bg-accent-solid hover:bg-accent-solid-hover border-y border-accent-line${selected}${groupBorder}`;
    }

    if (carNumber === this.selectedCar()) {
      return `bg-row-selected border-l-2 border-l-accent${groupBorder}`;
    }

    return `hover:bg-row-hover${groupBorder}`;
  }

  formatDuration(value: number | null | undefined): string {
    return formatDuration(value);
  }

  formatNumber(value: number | null | undefined): string {
    return value == null ? '—' : String(value);
  }

  formatLapNumber(value: number | null | undefined): string {
    return value == null ? '—' : `L${value}`;
  }

  formatScore(value: number | null | undefined): string {
    if (value == null) {
      return '—';
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  formatLapGroup(laps: number | null): string {
    if (laps == null) {
      return '—';
    }

    return Number.isInteger(laps) ? String(laps) : laps.toFixed(1);
  }
}

function compareEnduranceRows(a: EnduranceRow, b: EnduranceRow): number {
  const lapDiff = (b.laps ?? -Infinity) - (a.laps ?? -Infinity);
  if (lapDiff !== 0) {
    return lapDiff;
  }

  const positionDiff = compareNullableAsc(a.position, b.position);
  if (positionDiff !== 0) {
    return positionDiff;
  }

  const bestLapDiff = compareNullableAsc(a.bestLapTime, b.bestLapTime);
  if (bestLapDiff !== 0) {
    return bestLapDiff;
  }

  return a.carNumber - b.carNumber;
}

function compareNullableAsc(a: number | null, b: number | null): number {
  if (a == null && b == null) {
    return 0;
  }
  if (a == null) {
    return 1;
  }
  if (b == null) {
    return -1;
  }
  return a - b;
}

function findBestLap(laps: LapRecord[], listedBest: number | null): BestLap | null {
  const timedLaps = laps
    .map((lap, index) => ({ lap, index }))
    .filter((row) => row.lap.lapTime != null);

  if (timedLaps.length === 0) {
    return null;
  }

  const best =
    listedBest == null
      ? timedLaps.reduce((prev, cur) =>
          (cur.lap.lapTime ?? Infinity) < (prev.lap.lapTime ?? Infinity) ? cur : prev,
        )
      : (timedLaps.find((row) => Math.abs((row.lap.lapTime ?? 0) - listedBest) < 0.001) ??
        timedLaps.reduce((prev, cur) =>
          (cur.lap.lapTime ?? Infinity) < (prev.lap.lapTime ?? Infinity) ? cur : prev,
        ));

  return {
    lapNumber: best.lap.lapNumber ?? best.index + 1,
    lapTime: best.lap.lapTime,
  };
}

function formatDuration(value: number | null | undefined): string {
  if (value == null) {
    return '—';
  }

  const minutes = Math.floor(value / 60);
  const seconds = value - minutes * 60;

  if (minutes === 0) {
    return seconds.toFixed(3);
  }

  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}
