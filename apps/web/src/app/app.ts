import { Component, inject } from '@angular/core';
import { DataService } from './services/data-service';
import { HeaderComponent } from './components/header/header';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  template: `<div class="flex h-dvh flex-col overflow-hidden bg-canvas text-fg font-mono scheme-light dark:scheme-dark">
    <pw-header [lastUpdated]="data.lastUpdated()" [connected]="data.connected()" />
    <router-outlet class="contents" />
  </div>`,
  styleUrl: './app.css',
})
export class App {
  public data = inject(DataService);
  private theme = inject(ThemeService);

  constructor() {
    this.data.connect();
  }
}
