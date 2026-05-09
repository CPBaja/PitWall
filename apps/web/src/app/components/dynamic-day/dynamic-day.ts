import { Component, computed, inject, input, signal } from '@angular/core';
import { DataService } from '../../services/data-service';
import { ScoringService } from '../../services/scoring-service';
import { PinnedLeaderboardComponent } from '../pinned-leaderboard/pinned-leaderboard';
import { EventTableComponent } from '../event-table/event-table';
import { CarPanelComponent } from '../car-panel/car-panel';
import { TableColumn, TableRow } from '../static-day/static-day';
import { DynamicRun } from '../../models/types';

const dynamicEventNames = {
  acceleration: 'Acceleration',
  maneuverability: 'Maneuverability',
  traction: 'Traction',
  specialty: 'Rock Crawl',
} as const;

@Component({
  selector: 'pw-dynamic-day',
  standalone: true,
  imports: [PinnedLeaderboardComponent, EventTableComponent, CarPanelComponent],
  host: { class: 'contents' },
  templateUrl: './dynamic-day.html',
})
export class DynamicDayComponent {
  carNum = input.required<string>();
  myCarNumber = computed(() => +this.carNum());

  private data = inject(DataService);
  private scoring = inject(ScoringService);

  readonly scores = this.scoring.scores;
  readonly fieldStats = this.scoring.fieldStats;
  readonly carMap = this.data.carMap;

  readonly selectedCar = signal<number | null>(null);

  leftWidth() {
    return `width: ${this.selectedCar() ? '35%' : '50%'}`;
  }

  onCarClick(carNumber: number) {
    this.selectedCar.update((cur) => (cur === carNumber ? null : carNumber));
  }

  readonly dynamicColumns: TableColumn[] = [
    { key: 'accel', label: 'Accel', getValue: (r) => r.score?.accelerationScore },
    { key: 'maneuv', label: 'Maneuv', getValue: (r) => r.score?.maneuverabilityScore },
    { key: 'traction', label: 'Traction', getValue: (r) => r.score?.tractionScore },
    { key: 'specialty', label: 'Specialty', getValue: (r) => r.score?.specialtyScore },
    { key: 'total', label: 'Total', getValue: (r) => r.score?.dynamicTotal, highlight: true },
  ];

  readonly accelerationColumns: TableColumn[] = [
    {
      key: 'time',
      label: 'Time',
      getValue: (r) => this.run(r, dynamicEventNames.acceleration)?.correctedTime,
      format: formatTime,
      highlight: true,
    },
    {
      key: 'raw',
      label: 'Raw',
      getValue: (r) => this.run(r, dynamicEventNames.acceleration)?.rawTime,
      format: formatTime,
    },
    { key: 'score', label: 'Score', getValue: (r) => r.score?.accelerationScore },
    {
      key: 'status',
      label: 'Status',
      getValue: (r) => this.run(r, dynamicEventNames.acceleration)?.status,
      isText: true,
    },
  ];

  readonly maneuverabilityColumns: TableColumn[] = [
    {
      key: 'time',
      label: 'Time',
      getValue: (r) => this.run(r, dynamicEventNames.maneuverability)?.correctedTime,
      format: formatTime,
      highlight: true,
    },
    {
      key: 'raw',
      label: 'Raw',
      getValue: (r) => this.run(r, dynamicEventNames.maneuverability)?.rawTime,
      format: formatTime,
    },
    { key: 'score', label: 'Score', getValue: (r) => r.score?.maneuverabilityScore },
    {
      key: 'status',
      label: 'Status',
      getValue: (r) => this.run(r, dynamicEventNames.maneuverability)?.status,
      isText: true,
    },
  ];

  readonly tractionColumns: TableColumn[] = [
    {
      key: 'time',
      label: 'Time',
      getValue: (r) => this.run(r, dynamicEventNames.traction)?.correctedTime,
      format: formatTime,
      highlight: true,
    },
    {
      key: 'dist',
      label: 'Dist',
      getValue: (r) => this.run(r, dynamicEventNames.traction)?.distance.value,
    },
    { key: 'score', label: 'Score', getValue: (r) => r.score?.tractionScore },
    {
      key: 'status',
      label: 'Status',
      getValue: (r) => this.run(r, dynamicEventNames.traction)?.status,
      isText: true,
    },
  ];

  readonly specialtyColumns: TableColumn[] = [
    {
      key: 'time',
      label: 'Time',
      getValue: (r) => this.run(r, dynamicEventNames.specialty)?.correctedTime,
      format: formatTime,
      highlight: true,
    },
    {
      key: 'dist',
      label: 'Dist',
      getValue: (r) => this.run(r, dynamicEventNames.specialty)?.distance.value,
    },
    { key: 'score', label: 'Score', getValue: (r) => r.score?.specialtyScore },
    {
      key: 'status',
      label: 'Status',
      getValue: (r) => this.run(r, dynamicEventNames.specialty)?.status,
      isText: true,
    },
  ];

  readonly accelerationRows = computed(() => this.sortedByScore((r) => r.score?.accelerationScore));

  readonly maneuverabilityRows = computed(() =>
    this.sortedByScore((r) => r.score?.maneuverabilityScore),
  );

  readonly tractionRows = computed(() => this.sortedByScore((r) => r.score?.tractionScore));

  readonly specialtyRows = computed(() => this.sortedByScore((r) => r.score?.specialtyScore));

  private sortedByScore(getValue: (row: TableRow) => number | null | undefined): TableRow[] {
    return this.scores()
      .map((score) => ({ score, car: this.carMap().get(score.carNumber) ?? null }))
      .sort((a, b) => (getValue(b) ?? -1) - (getValue(a) ?? -1));
  }

  private run(row: TableRow, eventName: string): DynamicRun | null {
    return (
      row.car?.dynamicsData?.runs.find((run) => run.event === eventName && run.position !== null) ??
      null
    );
  }
}

function formatTime(value: number | string | null | undefined): string {
  return typeof value === 'number' ? value.toFixed(3) : '—';
}
