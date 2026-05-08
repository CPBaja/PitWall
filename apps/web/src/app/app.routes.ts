import { Routes } from '@angular/router';
import { StaticDayComponent } from './components/static-day/static-day';
// import { DynamicDayComponent }   from './components/dynamic-day/dynamic-day';
// import { EnduranceDayComponent } from './components/endurance-day/endurance-day';

export const routes: Routes = [
  { path: '', redirectTo: 'static/15', pathMatch: 'full' },
  { path: 'static/:carNum', component: StaticDayComponent },
  // { path: 'dynamic',   component: DynamicDayComponent },
  // { path: 'endurance', component: EnduranceDayComponent },
];
