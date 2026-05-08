import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data-service';
import { ScoringService } from '../../services/scoring-service';
import { PinnedLeaderboardComponent } from '../pinned-leaderboard/pinned-leaderboard';
import { EventTableComponent } from '../event-table/event-table';
import { CarPanelComponent } from '../car-panel/car-panel';
import { TeamScore } from '../../models/scoring-models';
import { CarData } from '../../models/types';

export interface TableRow {
  score: TeamScore | null;
  car: CarData | null;
}

export interface TableColumn {
  key: string;
  label: string;
  getValue: (row: TableRow) => number | string | null | undefined;
  format?: (value: number | string | null | undefined) => string;
  highlight?: boolean;
  isText?: boolean;
}

@Component({
  selector: 'pw-static-day',
  standalone: true,
  imports: [FormsModule, PinnedLeaderboardComponent, EventTableComponent, CarPanelComponent],
  host: { class: 'contents' },
  templateUrl: './static-day.html',
})
export class StaticDayComponent {
  carNum = input.required<string>();
  myCarNumber = computed(() => +this.carNum());

  private data = inject(DataService);
  private scoring = inject(ScoringService);

  readonly connected = this.data.connected;
  readonly lastUpdated = this.data.lastUpdated;
  readonly scores = this.scoring.scores;
  readonly carMap = this.data.carMap;

  readonly selectedCar = signal<number | null>(null);

  leftWidth() {
    return `width: ${this.selectedCar() ? '35%' : '50%'}`;
  }

  onCarClick(carNumber: number) {
    this.selectedCar.update((cur) => (cur === carNumber ? null : carNumber));
  }

  // ── Column defs ──────────────────────────────────────────────────────────

  readonly staticColumns: TableColumn[] = [
    { key: 'tech', label: 'Tech', getValue: (s) => s.car?.staticData?.passedTech, isText: true },
    { key: 'design', label: 'Design', getValue: (s) => s.score?.designScore },
    { key: 'cost', label: 'Cost', getValue: (s) => s.score?.costScore },
    { key: 'bp', label: 'BP', getValue: (s) => s.score?.bpScore },
    { key: 'total', label: 'Total', getValue: (s) => s.score?.staticTotal, highlight: true },
  ];

  readonly designColumns: TableColumn[] = [
    {
      key: 'score',
      label: 'Score',
      getValue: (s) => s.car?.staticData?.designScore,
      highlight: true,
    },
    { key: 'penalty', label: 'Penalty', getValue: (s) => s.car?.staticData?.designPenalty },
    {
      key: 'remarks',
      label: 'Remarks',
      getValue: (s) => s.car?.staticData?.designRemarks,
      isText: true,
    },
  ];

  readonly costColumns: TableColumn[] = [
    {
      key: 'proto',
      label: 'Proto',
      getValue: (s) => s.car?.staticData?.costPrototype,
      highlight: true,
    },
    { key: 'report', label: 'Report', getValue: (s) => s.car?.staticData?.costReport },
    { key: 'penalty', label: 'Penalty', getValue: (s) => s.car?.staticData?.costPenalty },
    { key: 'tech', label: 'Tech', getValue: (s) => s.car?.staticData?.passedTech, isText: true },
  ];

  readonly bpColumns: TableColumn[] = [
    { key: 'score', label: 'Score', getValue: (s) => s.car?.staticData?.bpScore, highlight: true },
    { key: 'penalty', label: 'Penalty', getValue: (s) => s.car?.staticData?.bpPenalty },
    {
      key: 'remarks',
      label: 'Remarks',
      getValue: (s) => s.car?.staticData?.bpRemarks,
      isText: true,
    },
  ];

  // ── Row builders ─────────────────────────────────────────────────────────

  private sortedByField(getValue: (row: TableRow) => number | null | undefined): TableRow[] {
    return this.scores()
      .map((score) => ({ score, car: this.carMap().get(score.carNumber) ?? null }))
      .sort((a, b) => (getValue(b) ?? -1) - (getValue(a) ?? -1));
  }

  readonly designRows = computed(() => this.sortedByField((r) => r.car?.staticData?.designScore));

  readonly costRows = computed(() => this.sortedByField((r) => r.score?.costScore));

  readonly bpRows = computed(() => this.sortedByField((r) => r.car?.staticData?.bpScore));
}
