import { Component, computed, input } from '@angular/core';
import { RevealDirective, CountUpDirective } from '../../motion';

@Component({
  selector: 'app-statistic-card',
  standalone: true,
  imports: [RevealDirective, CountUpDirective],
  templateUrl: './statistic-card.component.html',
  styleUrl: './statistic-card.component.scss',
})
export class StatisticCardComponent {
  value = input.required<number | string>();
  suffix = input<string>('');
  label = input.required<string>();
  description = input<string>('');

  /** Count-up target — animates from 0 when the card scrolls into view. */
  numericValue = computed(() => {
    const v = this.value();
    return typeof v === 'number' ? v : Number(v);
  });
}
