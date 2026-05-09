import { Component, computed, inject, input, signal } from '@angular/core';
import { DataService } from '../../services/data-service';
import { ScoringService } from '../../services/scoring-service';
import { PinnedLeaderboardComponent } from '../pinned-leaderboard/pinned-leaderboard';
import { CarPanelComponent } from '../car-panel/car-panel';
import { TableColumn } from '../static-day/static-day';

@Component({
  selector: 'pw-overall',
  standalone: true,
  imports: [PinnedLeaderboardComponent, CarPanelComponent],
  host: { class: 'contents' },
  templateUrl: './overall.html',
})
export class OverallComponent {
  carNum = input.required<string>();
  myCarNumber = computed(() => +this.carNum());

  private data = inject(DataService);
  private scoring = inject(ScoringService);

  readonly scores = this.scoring.scores;
  readonly carMap = this.data.carMap;

  readonly selectedCar = signal<number | null>(null);

  onCarClick(carNumber: number) {
    this.selectedCar.update((cur) => (cur === carNumber ? null : carNumber));
  }

  readonly overallColumns: TableColumn[] = [
    { key: 'static', label: 'Static', getValue: (r) => r.score?.staticTotal },
    { key: 'dynamic', label: 'Dynamic', getValue: (r) => r.score?.dynamicTotal },
    { key: 'endurance', label: 'Endurance', getValue: (r) => r.score?.enduranceScore },
    { key: 'total', label: 'Total', getValue: (r) => r.score?.grandTotal, highlight: true },
  ];
}
