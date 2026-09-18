import { Component, input } from '@angular/core';

@Component({
  selector: 'app-statistic-card',
  standalone: true,
  templateUrl: './statistic-card.component.html',
  styleUrl: './statistic-card.component.scss',
})
export class StatisticCardComponent {
  value = input.required<number | string>();
  suffix = input<string>('');
  label = input.required<string>();
  description = input<string>('');
}
