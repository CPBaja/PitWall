import { Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data-service';
import { OverrideService, CarOverrides } from '../../services/override-service';
import { ScoringService } from '../../services/scoring-service';
import { OverrideFieldComponent } from '../override-field/override-field';
import { DynamicRun, LapRecord } from '../../models/types';

const dynamicEventNames = {
  acceleration: 'Acceleration',
  maneuverability: 'Maneuverability',
  traction: 'Traction',
  specialty: 'Rock Crawl',
} as const;

interface LapHistoryRow {
  key: string;
  lapNumber: number | null;
  lapTime: number | null;
  segmentTime: number | null;
  passedAt: string | null;
  isBest: boolean;
}

interface BestLapRecord {
  index: number;
  lapNumber: number | null;
}

@Component({
  selector: 'pw-car-panel',
  standalone: true,
  imports: [FormsModule, OverrideFieldComponent],
  templateUrl: './car-panel.html',
  host: { class: 'flex flex-col min-h-0' },
})
export class CarPanelComponent {
  carNumber = input.required<number>();
  mode = input<'static' | 'dynamic' | 'endurance'>('static');
  close = output<void>();

  private data = inject(DataService);
  private scoring = inject(ScoringService);
  private overrides = inject(OverrideService);

  readonly car = computed(() => this.data.carMap().get(this.carNumber()) ?? null);
  readonly score = computed(() => this.scoring.getScore(this.carNumber()));
  readonly teamResult = computed(
    () => this.scoring.teamResults().find((team) => team.carNumber === this.carNumber()) ?? null,
  );
  readonly override = computed(() => this.overrides.getForCar(this.carNumber()));
  readonly hasOverrides = computed(() => this.overrides.overriddenCars().has(this.carNumber()));
  readonly isDynamic = computed(() => this.mode() === 'dynamic');
  readonly isEndurance = computed(() => this.mode() === 'endurance');
  readonly techStatus = computed(() => this.car()?.staticData?.passedTech?.trim() || null);
  readonly passedTech = computed(() => {
    const status = this.techStatus()?.toLowerCase();
    return status != null && status !== 'not yet';
  });

  readonly accelerationRun = computed(() => this.run(dynamicEventNames.acceleration));
  readonly maneuverabilityRun = computed(() => this.run(dynamicEventNames.maneuverability));
  readonly tractionRun = computed(() => this.run(dynamicEventNames.traction));
  readonly specialtyRun = computed(() => this.run(dynamicEventNames.specialty));
  readonly bestEnduranceLap = computed(() => {
    const endurance = this.car()?.enduranceData;
    return findBestLap(endurance?.laps ?? [], endurance?.bestLapTime ?? null);
  });
  readonly lapRows = computed<readonly LapHistoryRow[]>(() => {
    const best = this.bestEnduranceLap();
    return (this.car()?.enduranceData?.laps ?? [])
      .map((lap, index) => {
        const lapNumber = lap.lapNumber ?? index + 1;
        return {
          key: `${lapNumber}-${lap.passedAt ?? ''}-${lap.lapTime ?? ''}-${index}`,
          lapNumber,
          lapTime: lap.lapTime,
          segmentTime: lap.segmentTime,
          passedAt: lap.passedAt,
          isBest: best?.index === index,
        };
      })
      .sort((a, b) => (b.lapNumber ?? -Infinity) - (a.lapNumber ?? -Infinity));
  });

  readonly scoreSummary = computed(() => {
    const s = this.score();
    const ov = this.override();
    if (this.isEndurance()) {
      const team = this.teamResult();
      const hasEnduranceOverrides = ov.enduranceLaps != null || ov.finishOrder != null;
      return [
        {
          label: 'Pos',
          value: formatInteger(team?.finishOrder),
          overridden: ov.finishOrder != null,
        },
        {
          label: 'Laps',
          value: formatInteger(team?.enduranceLaps),
          overridden: ov.enduranceLaps != null,
        },
        {
          label: 'Avg Lap',
          value: formatDuration(this.car()?.enduranceData?.averageLapTime),
          overridden: false,
        },
        {
          label: 'Score',
          value: format(s?.enduranceScore),
          overridden: hasEnduranceOverrides,
        },
        {
          label: 'Overall',
          value: format(s?.grandTotal),
          overridden: this.hasOverrides(),
        },
      ];
    }

    if (this.isDynamic()) {
      const hasDynamicOverrides =
        ov.accelerationTime != null ||
        ov.maneuverabilityTime != null ||
        ov.tractionTime != null ||
        ov.tractionDist != null ||
        ov.specialtyTime != null ||
        ov.specialtyDist != null;
      return [
        {
          label: 'Accel',
          value: format(s?.accelerationScore),
          overridden: ov.accelerationTime != null,
        },
        {
          label: 'Maneuv',
          value: format(s?.maneuverabilityScore),
          overridden: ov.maneuverabilityTime != null,
        },
        {
          label: 'Traction',
          value: format(s?.tractionScore),
          overridden: ov.tractionTime != null || ov.tractionDist != null,
        },
        {
          label: 'Specialty',
          value: format(s?.specialtyScore),
          overridden: ov.specialtyTime != null || ov.specialtyDist != null,
        },
        {
          label: 'Total',
          value: format(s?.dynamicTotal),
          overridden: hasDynamicOverrides,
        },
      ];
    }
    return [
      {
        label: 'Design',
        value: format(s?.designScore),
        overridden: ov.designScore != null || ov.designPenalty != null,
      },
      {
        label: 'Cost',
        value: format(s?.costScore),
        overridden: ov.costPrototype != null || ov.costReport != null || ov.costPenalty != null,
      },
      {
        label: 'BP',
        value: format(s?.bpScore),
        overridden: ov.bpScore != null || ov.bpPenalty != null,
      },
      {
        label: 'Total',
        value: format(s?.staticTotal),
        overridden: this.hasOverrides(),
      },
    ];
  });

  set(field: keyof CarOverrides, value: number | null) {
    value === null
      ? this.overrides.resetField(this.carNumber(), field)
      : this.overrides.set(this.carNumber(), { [field]: value });
  }

  reset(field: keyof CarOverrides) {
    this.overrides.resetField(this.carNumber(), field);
  }
  resetAll() {
    this.overrides.resetCar(this.carNumber());
  }

  private run(eventName: string): DynamicRun | null {
    return (
      this.car()?.dynamicsData?.runs.find(
        (run) => run.event === eventName && run.position !== null,
      ) ?? null
    );
  }

  formatDuration(value: number | null | undefined): string {
    return formatDuration(value);
  }

  formatLapNumber(value: number | null | undefined): string {
    return value == null ? '—' : `L${value}`;
  }
}

function format(value: number | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatInteger(value: number | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function findBestLap(laps: LapRecord[], listedBest: number | null): BestLapRecord | null {
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
    index: best.index,
    lapNumber: best.lap.lapNumber ?? best.index + 1,
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
