import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { ServiceCardComponent } from '../../shared/components/service-card/service-card.component';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [RouterLink, ServiceCardComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
})
export class ServicesComponent implements OnInit {
  private contentService = inject(ContentService);
  private seoService = inject(SeoService);

  services = this.contentService.services;
  categories = this.contentService.serviceCategories;
  activeCategory = signal('all');

  filteredServices = signal(this.contentService.services());

  ngOnInit(): void {
    this.seoService.setPageMeta('services');
    this.filteredServices.set(this.services());
  }

  setCategory(category: string): void {
    this.activeCategory.set(category);
    if (category === 'all') {
      this.filteredServices.set(this.services());
    } else {
      this.filteredServices.set(
        this.services().filter((s) => s.category === category)
      );
    }
  }
}
