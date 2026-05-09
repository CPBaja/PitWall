import { Component, computed, inject, input, output, signal } from '@angular/core';
import { OverrideService } from '../../services/override-service';
import { TeamScore } from '../../models/scoring-models';
import { CarData } from '../../models/types';
import { TableColumn } from '../static-day/static-day';

@Component({
  selector: 'pw-pinned-leaderboard',
  standalone: true,
  imports: [],
  templateUrl: './pinned-leaderboard.html',
  host: { class: 'flex flex-1 min-h-0 flex-col overflow-hidden' },
})
export class PinnedLeaderboardComponent {
  scores = input<TeamScore[]>([]);
  carMap = input<Map<number, CarData>>(new Map());
  myCarNumber = input<number | null>(null);
  selectedCar = input<number | null>(null);
  columns = input<TableColumn[]>([]);
  carClick = output<number>();

  private overrides = inject(OverrideService);

  sortKey = signal('total');
  sortDir = signal<'asc' | 'desc'>('desc');

  gridStyle() {
    const cols = this.columns()
      .map(() => '1fr')
      .join(' ');
    return `grid-template-columns: 2rem 3rem 2fr ${cols}`;
  }

  setSort(key: string) {
    this.sortKey() === key
      ? this.sortDir.update((d) => (d === 'desc' ? 'asc' : 'desc'))
      : (this.sortKey.set(key), this.sortDir.set('desc'));
  }

  readonly sortedRows = computed(() => {
    const key = this.sortKey();
    const dir = this.sortDir();
    const col = this.columns().find((c) => c.key === key);

    return [...this.scores()]
      .map((score) => {
        const carNumber = score.carNumber;
        const car = this.carMap().get(carNumber) ?? null;
        return {
          carNumber,
          teamName: car?.teamName ?? '—',
          score,
          car,
          hasOverrides: this.overrides.overriddenCars().has(carNumber),
          rank: 0,
        };
      })
      .sort((a, b) => {
        const row = (x: typeof a) => ({ score: x.score, car: x.car });
        const aVal = col
          ? (col.getValue(row(a)) ?? -Infinity)
          : (a.score?.staticTotal ?? -Infinity);
        const bVal = col
          ? (col.getValue(row(b)) ?? -Infinity)
          : (b.score?.staticTotal ?? -Infinity);
        const result =
          typeof aVal === 'string' || typeof bVal === 'string'
            ? String(aVal).localeCompare(String(bVal))
            : (aVal as number) - (bVal as number);

        return dir === 'desc' ? -result : result;
      })
      .map((r, i) => ({ ...r, rank: i + 1 }));
  });

  rowClass(carNumber: number): string {
    if (carNumber === this.myCarNumber()) {
      const selected = carNumber === this.selectedCar() ? ' border-l-2 border-l-accent' : '';
      return `sticky top-0 bottom-0 z-10 bg-accent-solid hover:bg-accent-solid-hover border-y border-accent-line${selected}`;
    }
    if (carNumber === this.selectedCar()) {
      return 'bg-row-selected border-l-2 border-l-accent';
    }
    return 'hover:bg-row-hover';
  }

  fmt(val: number | string | null | undefined, col?: TableColumn): string {
    if (col?.format) return col.format(val);
    if (val == null) return '—';
    if (typeof val === 'string') return val;
    return Number.isInteger(val) ? String(val) : val.toFixed(1);
  }
}
