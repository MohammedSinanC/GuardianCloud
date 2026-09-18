import { Component, input, signal } from '@angular/core';
import { FaqItem as FaqItemModel } from '../../../core/models/website-content.model';

@Component({
  selector: 'app-faq-item',
  standalone: true,
  templateUrl: './faq-item.component.html',
  styleUrl: './faq-item.component.scss',
})
export class FaqItemComponent {
  item = input.required<FaqItemModel>();
  isOpen = signal(false);

  toggle(): void {
    this.isOpen.update((v) => !v);
  }
}
