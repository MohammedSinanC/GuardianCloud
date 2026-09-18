import { Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ContentService } from '../../../core/services/content.service';

@Component({
  selector: 'app-whatsapp-button',
  standalone: true,
  templateUrl: './whatsapp-button.component.html',
  styleUrl: './whatsapp-button.component.scss',
})
export class WhatsappButtonComponent {
  private contentService = inject(ContentService);
  private platformId = inject(PLATFORM_ID);

  company = this.contentService.company;

  openWhatsApp(): void {
    const phone = this.company()?.whatsapp?.replace(/[^0-9]/g, '') ?? '';
    const message = 'Hello! I would like to inquire about your services.';
    if (isPlatformBrowser(this.platformId)) {
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        '_blank'
      );
    }
  }

  callNow(): void {
    const phone = this.company()?.phone ?? '';
    if (isPlatformBrowser(this.platformId)) {
      window.open(`tel:${phone}`, '_self');
    }
  }
}
