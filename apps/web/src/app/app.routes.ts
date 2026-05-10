import { Routes } from '@angular/router';
import { StaticDayComponent } from './components/static-day/static-day';
import { DynamicDayComponent } from './components/dynamic-day/dynamic-day';
import { OverallComponent } from './components/overall/overall';
import { EnduranceDayComponent } from './components/endurance-day/endurance-day';

export const routes: Routes = [
  { path: '', redirectTo: 'overall/15', pathMatch: 'full' },
  { path: 'overall/:carNum', component: OverallComponent },
  { path: 'static/:carNum', component: StaticDayComponent },
  { path: 'dynamic/:carNum', component: DynamicDayComponent },
  { path: 'endurance/:carNum', component: EnduranceDayComponent },
];
