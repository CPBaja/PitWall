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
        return dir === 'desc'
          ? (bVal as number) - (aVal as number)
          : (aVal as number) - (bVal as number);
      })
      .map((r, i) => ({ ...r, rank: i + 1 }));
  });

  readonly pinnedRow = computed(() => {
    if (this.myCarNumber == null) return null;
    const rows = this.sortedRows();
    const idx = rows.findIndex((r) => r.carNumber === this.myCarNumber());
    // Only show pin if scrolled out of visible area — approximate by index >= 15
    return idx >= 15 ? rows[idx] : null;
  });

  rowClass(carNumber: number): string {
    if (carNumber === this.selectedCar()) return 'bg-zinc-800/60 border-l-2 border-l-amber-400';
    if (carNumber === this.myCarNumber()) return 'bg-amber-400/5 hover:bg-amber-400/10';
    return 'hover:bg-zinc-800/30';
  }

  fmt(val: number | string | null | undefined): string {
    if (val == null) return '—';
    if (typeof val === 'string') return val;
    return Number.isInteger(val) ? String(val) : val.toFixed(1);
  }
}
