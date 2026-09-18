import { Component, input } from '@angular/core';
import { Testimonial } from '../../../core/models/website-content.model';

@Component({
  selector: 'app-testimonial-card',
  standalone: true,
  templateUrl: './testimonial-card.component.html',
  styleUrl: './testimonial-card.component.scss',
})
export class TestimonialCardComponent {
  testimonial = input.required<Testimonial>();

  get stars(): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
