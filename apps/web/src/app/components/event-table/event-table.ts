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

  gridStyle() {
    const cols = this.columns()
      .map((c) => (c.isText ? '2fr' : '1fr'))
      .join(' ');
    return `grid-template-columns: 3rem 1fr ${cols}`;
  }

  get visibleRows() {
    return this.rows();
  }

  isMyCar(n: number) {
    return n === this.myCarNumber();
  }
  rowKey(row: TableRow) {
    return row.score?.carNumber ?? row.car?.carNumber;
  }

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

  cellClass(col: TableColumn, row: TableRow): string {
    const val = col.getValue(row);
    if (val == null) return 'text-faint';
    if (col.highlight) return 'text-fg';
    if (col.isText) return 'text-muted truncate';
    return 'text-subtle';
  }

  fmtCell(val: number | string | null | undefined, col: TableColumn): string {
    if (col.format) return col.format(val);
    if (val == null) return '—';
    if (typeof val === 'string') return val.length > 18 ? val.slice(0, 18) + '…' : val;
    return Number.isInteger(val) ? String(val) : val.toFixed(1);
  }
}
