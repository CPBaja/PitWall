import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../services/theme-service';

export type NavTab = 'static' | 'dynamic' | 'endurance';
const MY_CAR_KEY = 'pitwall_my_car';

@Component({
  selector: 'pw-header',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  host: { class: 'contents' },
})
export class HeaderComponent {
  private router = inject(Router);
  readonly theme = inject(ThemeService);

  readonly myCarNumber = signal<number | null>(null);
  readonly lastUpdated = input<Date | null>(null);
  readonly connected = input<boolean>(false);

  readonly tabs = [
    { label: 'Overall', path: 'overall' },
    { label: 'Static', path: 'static' },
    { label: 'Dynamic', path: 'dynamic' },
    { label: 'Endurance', path: 'endurance' },
  ];

  constructor() {
    effect(() => {
      const car = this.myCarNumber();
      const url = this.router.url;

      const activeTab = url.match(/^\/(overall|static|dynamic|endurance)(?:\/|$)/)?.[1];

      if (car != null && activeTab) {
        this.router.navigate([`/${activeTab}`, car]);
      }
    });
  }

  ngOnInit() {
    const saved = localStorage.getItem(MY_CAR_KEY);
    if (saved) {
      this.myCarNumber.set(Number(saved));
    }
  }

  onCarChange(value: number | null) {
    if (value == null || isNaN(value)) {
      this.myCarNumber.set(null);
      localStorage.removeItem(MY_CAR_KEY);
    } else {
      this.myCarNumber.set(value);
      localStorage.setItem(MY_CAR_KEY, String(value));
    }
  }

  tabLink(path: string) {
    return [`/${path}`, this.myCarNumber() ?? this.carNumberFromUrl() ?? 15];
  }

  private carNumberFromUrl(): number | null {
    const match = this.router.url.match(/^\/(?:overall|static|dynamic|endurance)\/(\d+)/);
    return match ? Number(match[1]) : null;
  }
}
