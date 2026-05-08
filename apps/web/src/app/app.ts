import { Component, inject, signal } from '@angular/core';
import { DataService } from './services/data-service';
import { HeaderComponent } from './components/header/header';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  template: `<div class="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden font-mono">
    <pw-header [lastUpdated]="data.lastUpdated()" [connected]="data.connected()" />
    <router-outlet />
  </div>`,
  styleUrl: './app.css',
})
export class App {
  public data = inject(DataService);

  constructor() {
    this.data.connect();
  }
}
