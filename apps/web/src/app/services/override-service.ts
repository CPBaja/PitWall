import { computed, Injectable, signal } from '@angular/core';

export interface CarOverrides {
  // Static
  designScore?: number;
  designPenalty?: number;
  costPrototype?: number;
  costReport?: number;
  costPenalty?: number;
  bpScore?: number;
  bpPenalty?: number;

  // Dynamic
  accelerationTime?: number;
  tractionTime?: number;
  tractionDist?: number;
  maneuverabilityTime?: number;
  specialtyTime?: number;
  specialtyDist?: number;

  // Endurance
  enduranceLaps?: number;
  finishOrder?: number;
}

type OverrideMap = Map<number, CarOverrides>;

@Injectable({
  providedIn: 'root',
})
export class OverrideService {
  private readonly _overrides = signal<OverrideMap>(new Map());

  readonly overrides = this._overrides.asReadonly();

  readonly overriddenCars = computed(() => new Set(this._overrides().keys()));

  set(carNumber: number, fields: Partial<CarOverrides>) {
    this._overrides.update((map) => {
      const next = new Map(map);
      next.set(carNumber, { ...next.get(carNumber), ...fields });
      return next;
    });
  }

  resetField(carNumber: number, field: keyof CarOverrides) {
    this._overrides.update((map) => {
      const next = new Map(map);
      const current = { ...next.get(carNumber) };
      delete current[field];
      Object.keys(current).length ? next.set(carNumber, current) : next.delete(carNumber);
      return next;
    });
  }

  resetCar(carNumber: number) {
    this._overrides.update((map) => {
      const next = new Map(map);
      next.delete(carNumber);
      return next;
    });
  }

  resetAll() {
    this._overrides.set(new Map());
  }

  getForCar(carNumber: number): CarOverrides {
    return this._overrides().get(carNumber) ?? {};
  }

  isFieldOverridden(carNumber: number, field: keyof CarOverrides): boolean {
    return field in (this._overrides().get(carNumber) ?? {});
  }
}
