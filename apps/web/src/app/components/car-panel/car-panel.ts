import { Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data-service';
import { OverrideService, CarOverrides } from '../../services/override-service';
import { ScoringService } from '../../services/scoring-service';
import { OverrideFieldComponent } from '../override-field/override-field';
import { DynamicRun } from '../../models/types';

const dynamicEventNames = {
  acceleration: 'Acceleration',
  maneuverability: 'Maneuverability',
  traction: 'Traction',
  specialty: 'Rock Crawl',
} as const;

@Component({
  selector: 'pw-car-panel',
  standalone: true,
  imports: [FormsModule, OverrideFieldComponent],
  templateUrl: './car-panel.html',
  host: { class: 'flex flex-col min-h-0' },
})
export class CarPanelComponent {
  carNumber = input.required<number>();
  mode = input<'static' | 'dynamic'>('static');
  close = output<void>();

  private data = inject(DataService);
  private scoring = inject(ScoringService);
  private overrides = inject(OverrideService);

  readonly car = computed(() => this.data.carMap().get(this.carNumber()) ?? null);
  readonly score = computed(() => this.scoring.getScore(this.carNumber()));
  readonly override = computed(() => this.overrides.getForCar(this.carNumber()));
  readonly hasOverrides = computed(() => this.overrides.overriddenCars().has(this.carNumber()));
  readonly isDynamic = computed(() => this.mode() === 'dynamic');
  readonly techStatus = computed(() => this.car()?.staticData?.passedTech?.trim() || null);
  readonly passedTech = computed(() => {
    const status = this.techStatus()?.toLowerCase();
    return status != null && status !== 'not yet';
  });

  readonly accelerationRun = computed(() => this.run(dynamicEventNames.acceleration));
  readonly maneuverabilityRun = computed(() => this.run(dynamicEventNames.maneuverability));
  readonly tractionRun = computed(() => this.run(dynamicEventNames.traction));
  readonly specialtyRun = computed(() => this.run(dynamicEventNames.specialty));

  readonly scoreSummary = computed(() => {
    const s = this.score();
    const ov = this.override();
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
}

function format(value: number | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
