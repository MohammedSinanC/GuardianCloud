import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { FaqItemComponent } from '../../shared/components/faq-item/faq-item.component';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [RouterLink, FaqItemComponent],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss',
})
export class FaqComponent implements OnInit {
  private contentService = inject(ContentService);
  private seoService = inject(SeoService);

  faq = this.contentService.faq;
  company = this.contentService.company;

  ngOnInit(): void {
    this.seoService.setPageMeta('faq');
  }

  getWhatsAppLink(): string {
    const phone = this.company()?.whatsapp?.replace(/[^0-9]/g, '') ?? '';
    return 'https://wa.me/' + phone;
  }
}
