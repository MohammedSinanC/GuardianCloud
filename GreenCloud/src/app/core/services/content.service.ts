import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { WebsiteContent } from '../models/website-content.model';
import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private httpClient = inject(HttpClientService);
  private platformId = inject(PLATFORM_ID);

  private readonly contentSignal = signal<WebsiteContent | null>(null);
  readonly content = this.contentSignal.asReadonly();

  /* ---------- Derived convenience signals ---------- */
  readonly company = computed(() => this.contentSignal()?.company ?? null);
  readonly navigation = computed(() => this.contentSignal()?.navigation ?? null);
  readonly hero = computed(() => this.contentSignal()?.hero ?? null);
  readonly trust = computed(() => this.contentSignal()?.trust ?? []);
  readonly services = computed(() => this.contentSignal()?.services ?? []);
  readonly serviceCategories = computed(() => this.contentSignal()?.serviceCategories ?? []);
  readonly about = computed(() => this.contentSignal()?.about ?? null);
  readonly whyChooseUs = computed(() => this.contentSignal()?.whyChooseUs ?? []);
  readonly statistics = computed(() => this.contentSignal()?.statistics ?? []);
  readonly processSteps = computed(() => this.contentSignal()?.process ?? []);
  readonly locations = computed(() => this.contentSignal()?.locations ?? []);
  readonly testimonials = computed(() => this.contentSignal()?.testimonials ?? []);
  readonly faq = computed(() => this.contentSignal()?.faq ?? []);
  readonly contact = computed(() => this.contentSignal()?.contact ?? null);
  readonly footer = computed(() => this.contentSignal()?.footer ?? null);
  readonly socialLinks = computed(() => this.contentSignal()?.socialLinks ?? []);
  readonly seo = computed(() => this.contentSignal()?.seo ?? null);
  readonly pestTypes = computed(() => this.contentSignal()?.pestTypes ?? []);
  readonly inspectionTypes = computed(() => this.contentSignal()?.inspectionTypes ?? []);
  readonly checklists = computed(() => this.contentSignal()?.checklists ?? []);
  readonly serviceTypes = computed(() => this.contentSignal()?.serviceTypes ?? []);
  readonly contractTypes = computed(() => this.contentSignal()?.contractTypes ?? []);
  readonly loading = computed(() => this.contentSignal() === null);

  /**
   * Load content from API (/api/content).
   * Falls back to static JSON if API is unavailable.
   */
  async loadContent(): Promise<void> {
    try {
      const response: any = await new Promise((resolve, reject) => {
        this.httpClient.get<any>('/content').subscribe({
          next: resolve,
          error: reject,
        });
      });

      if (response.success && response.data) {
        this.contentSignal.set(response.data);
        return;
      }
    } catch (err) {
      console.error('Failed to load website content from API:', err);
    }
  }

  /** Find a service by its slug/id */
  getServiceBySlug(slug: string): import('../models/website-content.model').Service | undefined {
    return this.services().find((s) => s.id === slug);
  }

  /** Get services filtered by category */
  getServicesByCategory(category: string): import('../models/website-content.model').Service[] {
    if (category === 'all') return this.services();
    return this.services().filter((s) => s.category === category);
  }
}
