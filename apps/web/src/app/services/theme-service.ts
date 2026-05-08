import { Injectable, signal } from '@angular/core';

type Theme = 'light' | 'dark';
const THEME_COOKIE = 'pitwall_theme';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.readCookie() ?? 'dark');

  constructor() {
    this.applyTheme(this.theme());
  }

  toggle() {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private setTheme(theme: Theme) {
    this.theme.set(theme);
    document.cookie = `${THEME_COOKIE}=${theme}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
    this.applyTheme(theme);
  }

  private readCookie(): Theme | null {
    const value = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith(`${THEME_COOKIE}=`))
      ?.split('=')[1];

    return value === 'light' || value === 'dark' ? value : null;
  }

  private applyTheme(theme: Theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }
}
