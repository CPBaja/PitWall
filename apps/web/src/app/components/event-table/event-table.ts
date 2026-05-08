import { Component, input, output } from '@angular/core';
import { TableRow, TableColumn } from '../static-day/static-day';

@Component({
  selector: 'pw-event-table',
  imports: [],
  host: { class: 'flex flex-col min-h-0 max-h-[20rem]' },
  templateUrl: './event-table.html',
})
export class EventTableComponent {
  rows = input<TableRow[]>([]);
  columns = input<TableColumn[]>([]);
  myCarNumber = input<number | null>(null);
  selectedCar = input<number | null>(null);
  carClick = output<number>();

  readonly TOP_N = 10;

  gridStyle() {
    const cols = this.columns()
      .map((c) => (c.isText ? '2fr' : '1fr'))
      .join(' ');
    return `grid-template-columns: 3rem 1fr ${cols}`;
  }

  get visibleRows() {
    return this.rows();
  }

  get pinnedRow(): TableRow | null {
    if (this.myCarNumber == null) return null;
    const idx = this.rows().findIndex((r) => (r.score?.carNumber ?? -1) === this.myCarNumber());
    return idx >= this.TOP_N ? this.rows()[idx] : null;
  }

  isMyCar(n: number) {
    return n === this.myCarNumber();
  }
  rowKey(row: TableRow) {
    return row.score?.carNumber ?? row.car?.carNumber;
  }

  rowClass(carNumber: number): string {
    if (carNumber === this.selectedCar()) return 'bg-zinc-800/60 border-l-2 border-l-amber-400';
    if (carNumber === this.myCarNumber()) return 'bg-amber-400/5 hover:bg-amber-400/10';
    return 'hover:bg-zinc-800/30';
  }

  cellClass(col: TableColumn, row: TableRow): string {
    const val = col.getValue(row);
    if (val == null) return 'text-zinc-600';
    if (col.highlight) return 'text-zinc-100';
    if (col.isText) return 'text-zinc-500 truncate';
    return 'text-zinc-400';
  }

  fmtCell(val: number | string | null | undefined, col: TableColumn): string {
    if (val == null) return '—';
    if (typeof val === 'string') return val.length > 18 ? val.slice(0, 18) + '…' : val;
    return Number.isInteger(val) ? String(val) : val.toFixed(1);
  }
}
