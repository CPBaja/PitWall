import { computed, Injectable, signal } from '@angular/core';
import { FullData } from '../models/types';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private readonly _fullData = signal<FullData | null>(null);
  private readonly _connected = signal(false);
  private readonly _error = signal<Error | null>(null);

  readonly fullData = this._fullData.asReadonly();
  readonly connected = this._connected.asReadonly();
  readonly error = this._error.asReadonly();

  readonly cars = computed(() => this._fullData()?.cars ?? []);
  readonly raceContext = computed(() => this._fullData()?.raceContext ?? null);
  readonly lastUpdated = computed(() => this._fullData()?.lastUpdated ?? null);

  readonly carMap = computed(() => new Map(this.cars().map((c) => [c.carNumber, c])));

  private es: EventSource | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectDelay = 2_000;

  connect(url = environment.SSE_URL) {
    if (this.es) {
      return;
    }

    this.openConnection(url);
  }

  private openConnection(url: string) {
    this.es = new EventSource(url);

    this.es.onopen = () => {
      this._connected.set(true);
      this._error.set(null);
      this.reconnectDelay = 2_000; // reset backoff on successful connect
    };

    this.es.onmessage = (event: MessageEvent) => {
      try {
        const data: FullData = JSON.parse(event.data);
        this._fullData.set(data);
      } catch {
        this._error.set(new Error('Failed to parse data from server'));
      }
    };

    this.es.onerror = () => {
      this._connected.set(false);
      this.es?.close();
      this.es = null;
      this.scheduleReconnect(url);
    };
  }

  private scheduleReconnect(url: string) {
    this.reconnectTimeout = setTimeout(() => {
      console.log(`[DataService] Reconnecting (delay ${this.reconnectDelay}ms)...`);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000); // exp backoff, cap 30s
      this.openConnection(url);
    }, this.reconnectDelay);
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.es?.close();
    this.es = null;
    this._connected.set(false);
  }

  ngOnDestroy() {
    this.disconnect();
  }
}
