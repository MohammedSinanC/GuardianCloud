import { Component, input } from '@angular/core';

@Component({
  selector: 'app-section-heading',
  standalone: true,
  templateUrl: './section-heading.component.html',
  styleUrl: './section-heading.component.scss',
})
export class SectionHeadingComponent {
  badge = input<string>('');
  title = input.required<string>();
  description = input<string>('');
  light = input<boolean>(false);
}
