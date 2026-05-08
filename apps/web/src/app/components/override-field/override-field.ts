import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'pw-override-field',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './override-field.html',
})
export class OverrideFieldComponent {
  label = input.required<string>();
  hint = input<string | undefined>();
  liveValue = input<number | null | undefined>();

  overrideValue = model<number | null>(null);

  reset = output<void>();
}
