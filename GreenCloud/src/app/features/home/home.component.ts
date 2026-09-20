import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { SectionHeadingComponent } from '../../shared/components/section-heading/section-heading.component';
import { ServiceCardComponent } from '../../shared/components/service-card/service-card.component';
import { StatisticCardComponent } from '../../shared/components/statistic-card/statistic-card.component';
import { TestimonialCardComponent } from '../../shared/components/testimonial-card/testimonial-card.component';
import { FaqItemComponent } from '../../shared/components/faq-item/faq-item.component';
import {
  RevealDirective,
  ParallaxDirective,
  VideoBgDirective,
} from '../../shared/motion';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    SectionHeadingComponent,
    ServiceCardComponent,
    StatisticCardComponent,
    TestimonialCardComponent,
    FaqItemComponent,
    RevealDirective,
    ParallaxDirective,
    VideoBgDirective,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private contentService = inject(ContentService);
  private seoService = inject(SeoService);

  hero = this.contentService.hero;
  trust = this.contentService.trust;
  services = this.contentService.services;
  about = this.contentService.about;
  statistics = this.contentService.statistics;
  whyChooseUs = this.contentService.whyChooseUs;
  processSteps = this.contentService.processSteps;
  locations = this.contentService.locations;
  testimonials = this.contentService.testimonials;
  faq = this.contentService.faq;
  company = this.contentService.company;

  getStarArray(): number[] {
    return [1, 2, 3, 4, 5];
  }

  getWhatsAppLink(): string {
    const phone = this.company()?.whatsapp?.replace(/[^0-9]/g, '') ?? '';
    return 'https://wa.me/' + phone;
  }
}
