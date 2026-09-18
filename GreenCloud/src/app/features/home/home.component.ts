import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ElementRef,
  AfterViewInit,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { SectionHeadingComponent } from '../../shared/components/section-heading/section-heading.component';
import { ServiceCardComponent } from '../../shared/components/service-card/service-card.component';
import { StatisticCardComponent } from '../../shared/components/statistic-card/statistic-card.component';
import { TestimonialCardComponent } from '../../shared/components/testimonial-card/testimonial-card.component';
import { FaqItemComponent } from '../../shared/components/faq-item/faq-item.component';

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
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private contentService = inject(ContentService);
  private seoService = inject(SeoService);
  private el = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);

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

  /** Animated statistics values */
  animatedStats = signal<{ value: number; label: string; suffix: string; description: string }[]>([]);

  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    this.seoService.setPageMeta('home');
    this.initializeAnimatedStats();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.setupScrollAnimations();
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private initializeAnimatedStats(): void {
    this.animatedStats.set(
      this.statistics().map((s) => ({ ...s, value: 0 }))
    );
  }

  animateCounter(targetIndex: number): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const stats = this.statistics();
    if (!stats[targetIndex]) return;

    const target = stats[targetIndex].value;
    const duration = 2000;
    const startTime = performance.now();
    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(eased * target);

      this.animatedStats.update((prev) => {
        const updated = [...prev];
        updated[targetIndex] = { ...updated[targetIndex], value: currentValue };
        return updated;
      });

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  private setupScrollAnimations(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const elements = this.el.nativeElement.querySelectorAll('.reveal');
    const statSection = this.el.nativeElement.querySelector('.home-stats');
    let statsAnimated = false;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');

            // Animate stats when section comes into view
            if (entry.target === statSection && !statsAnimated) {
              statsAnimated = true;
              this.statistics().forEach((_, i) => {
                setTimeout(() => this.animateCounter(i), i * 200);
              });
            }
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((el: Element) => this.observer!.observe(el));
  }

  getStarArray(): number[] {
    return [1, 2, 3, 4, 5];
  }

  getWhatsAppLink(): string {
    const phone = this.company()?.whatsapp?.replace(/[^0-9]/g, '') ?? '';
    return 'https://wa.me/' + phone;
  }
}
