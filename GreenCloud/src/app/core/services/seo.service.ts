import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { ContentService } from './content.service';

/**
 * ============================================================
 * SEO SERVICE
 * ============================================================
 * Manages page titles, meta descriptions, and Open Graph tags.
 * Edit SEO content in: public/assets/content/website-content.json
 * under the "seo" key.
 * ============================================================
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private contentService = inject(ContentService);

  /** Set metadata for a specific page */
  setPageMeta(
    pageKey: 'home' | 'services' | 'about' | 'contact' | 'branches' | 'faq',
    companyName?: string
  ): void {
    const seoData = this.contentService.seo();
    const company = this.contentService.company();
    const pageName = companyName ?? company?.name ?? 'Al Waha Hygiene';

    if (!seoData) return;

    const page = seoData[pageKey];
    if (!page) return;

    this.titleService.setTitle(page.title);

    this.metaService.updateTag({
      name: 'description',
      content: page.description,
    });

    this.metaService.updateTag({
      property: 'og:title',
      content: page.title,
    });

    this.metaService.updateTag({
      property: 'og:description',
      content: page.description,
    });

    this.metaService.updateTag({
      property: 'og:site_name',
      content: pageName,
    });

    if (page.keywords) {
      this.metaService.updateTag({
        name: 'keywords',
        content: page.keywords,
      });
    }
  }

  /** Set metadata for a service detail page */
  setServicePageMeta(
    serviceTitle: string,
    serviceDescription: string
  ): void {
    const company = this.contentService.company();
    const siteName = company?.name ?? 'Al Waha Hygiene';
    const fullTitle = `${serviceTitle} | ${siteName}`;

    this.titleService.setTitle(fullTitle);

    this.metaService.updateTag({
      name: 'description',
      content: serviceDescription,
    });

    this.metaService.updateTag({
      property: 'og:title',
      content: fullTitle,
    });

    this.metaService.updateTag({
      property: 'og:description',
      content: serviceDescription,
    });
  }
}
