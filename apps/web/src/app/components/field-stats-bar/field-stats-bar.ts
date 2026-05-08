import { Component, input } from '@angular/core';

export interface FieldStatsItem {
  key: string;
  label: string;
  tMin: number | null;
  bestCarNumber: number | null;
  bestTeamName: string | null;
}

@Component({
  selector: 'pw-field-stats-bar',
  standalone: true,
  imports: [],
  templateUrl: './field-stats-bar.html',
  host: { class: 'contents' },
})
export class FieldStatsBarComponent {
  stats = input<FieldStatsItem[]>([]);

  fmtTime(value: number | null): string {
    return value == null || value === 0 ? '—' : value.toFixed(3);
  }

  bestLabel(stat: FieldStatsItem): string {
    if (stat.bestCarNumber == null) {
      return '—';
    }

    return `#${stat.bestCarNumber} ${stat.bestTeamName ?? '—'}`;
  }
}
