import { Component, input, output } from '@angular/core';
import { TableRow, TableColumn } from '../static-day/static-day';

@Component({
  selector: 'pw-event-table',
  imports: [],
  host: { class: 'flex flex-1 flex-col min-h-0 overflow-hidden' },
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
    if (carNumber === this.selectedCar()) {
      return 'bg-row-selected border-l-2 border-l-accent';
    }
    if (carNumber === this.myCarNumber()) {
      return 'bg-accent-soft hover:bg-accent-soft-hover';
    }
    return 'hover:bg-row-hover';
  }

  cellClass(col: TableColumn, row: TableRow): string {
    const val = col.getValue(row);
    if (val == null) return 'text-faint';
    if (col.highlight) return 'text-fg';
    if (col.isText) return 'text-muted truncate';
    return 'text-subtle';
  }

  fmtCell(val: number | string | null | undefined, col: TableColumn): string {
    if (val == null) return '—';
    if (typeof val === 'string') return val.length > 18 ? val.slice(0, 18) + '…' : val;
    return Number.isInteger(val) ? String(val) : val.toFixed(1);
  }
}
