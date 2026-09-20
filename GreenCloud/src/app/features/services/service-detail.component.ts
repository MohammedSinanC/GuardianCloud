import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { Service } from '../../core/models/website-content.model';
import { FaqItemComponent } from '../../shared/components/faq-item/faq-item.component';
import { ParallaxDirective } from '../../shared/motion';

@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [RouterLink, FaqItemComponent, ParallaxDirective],
  templateUrl: './service-detail.component.html',
  styleUrl: './service-detail.component.scss',
})
export class ServiceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private contentService = inject(ContentService);
  private seoService = inject(SeoService);

  service = signal<Service | undefined>(undefined);
  relatedServices = signal<Service[]>([]);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    const found = this.contentService.getServiceBySlug(slug);
    this.service.set(found);

    if (found) {
      this.seoService.setServicePageMeta(found.title, found.shortDescription);

      // Get related services (same category, excluding current)
      const related = this.contentService
        .services()
        .filter((s) => s.category === found.category && s.id !== found.id)
        .slice(0, 3);
      this.relatedServices.set(related);
    }
  }
}
