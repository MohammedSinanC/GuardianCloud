import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../../../core/services/http-client.service';

@Component({
  selector: 'app-website-content',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="master-page">
      <div class="master-header">
        <h2>Website Content</h2>
        <button class="btn-add" (click)="loadAll()" [disabled]="loading()">
          <span class="material-icons-outlined">refresh</span> Refresh
        </button>
      </div>

      <div class="info-banner">
        <span class="material-icons-outlined">info</span>
        Edit website content sections. Changes are saved per section. All data is stored in MongoDB.
      </div>

      @if (loading()) {
        <div class="skeleton-table"></div>
      }

      @if (!loading()) {
        <div class="sections-list">
          @for (section of sectionKeys; track section) {
            <div class="section-card" [class.active]="activeSection() === section" (click)="selectSection(section)">
              <div class="section-card__left">
                <span class="material-icons-outlined section-card__icon">{{ getSectionIcon(section) }}</span>
                <div>
                  <h4 class="section-card__title">{{ getSectionLabel(section) }}</h4>
                  <p class="section-card__desc">{{ getSectionDesc(section) }}</p>
                </div>
              </div>
              <span class="material-icons-outlined section-card__arrow">chevron_right</span>
            </div>
          }
        </div>

        @if (activeSection() && editData() !== null) {
          <div class="editor-panel">
            <div class="editor-header">
              <h3>{{ getSectionLabel(activeSection()!) }}</h3>
              <div class="editor-actions">
                <button class="btn-cancel" (click)="cancelEdit()">Cancel</button>
                <button class="btn-save" (click)="saveSection()" [disabled]="saving()">
                  @if (saving()) { <span class="spinner"></span> Saving... } @else { Save Changes }
                </button>
              </div>
            </div>

            @if (saveSuccess()) {
              <div class="save-success">
                <span class="material-icons-outlined">check_circle</span>
                Changes saved successfully
              </div>
            }

            @if (saveError()) {
              <div class="dlg-error">{{ saveError() }}</div>
            }

            <div class="editor-body">
              <textarea class="editor-json" [(ngModel)]="editJson" rows="20" placeholder="JSON content..."></textarea>
            </div>
          </div>
        }
      }
    </div>
  `,
  styleUrls: ['../shared-master.css', './website-content.component.css'],
})
export class WebsiteContentComponent implements OnInit {
  private http = inject(HttpClientService);

  loading = signal(true);
  saving = signal(false);
  sections = signal<any>({});
  activeSection = signal<string | null>(null);
  editData = signal<any>(null);
  editJson = '';
  saveSuccess = signal(false);
  saveError = signal('');

  sectionKeys = [
    'company', 'navigation', 'hero', 'trust', 'services', 'serviceCategories',
    'about', 'whyChooseUs', 'statistics', 'process', 'locations', 'testimonials',
    'faq', 'contact', 'footer', 'socialLinks', 'seo',
  ];

  ngOnInit() { this.loadAll(); }

  async loadAll() {
    this.loading.set(true);
    try {
      const res: any = await firstValueFrom(this.http.get('/content'));
      if (res.success) this.sections.set(res.data || {});
    } catch { this.sections.set({}); }
    finally { this.loading.set(false); }
  }

  selectSection(key: string) {
    this.activeSection.set(key);
    this.editData.set(this.sections()[key] || {});
    this.editJson = JSON.stringify(this.sections()[key] || {}, null, 2);
    this.saveSuccess.set(false);
    this.saveError.set('');
  }

  cancelEdit() {
    this.activeSection.set(null);
    this.editData.set(null);
  }

  async saveSection() {
    const key = this.activeSection();
    if (!key) return;

    this.saving.set(true);
    this.saveError.set('');
    this.saveSuccess.set(false);

    try {
      const parsed = JSON.parse(this.editJson);
      await firstValueFrom(this.http.put(`/content/${key}`, { data: parsed, section: key }));

      // Update local state
      this.sections.update(s => ({ ...s, [key]: parsed }));
      this.saveSuccess.set(true);
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        this.saveError.set('Invalid JSON format');
      } else {
        this.saveError.set(err?.error?.message || 'Failed to save');
      }
    } finally { this.saving.set(false); }
  }

  getSectionIcon(key: string): string {
    const icons: Record<string, string> = {
      company: 'business', navigation: 'menu', hero: 'featured_play_list',
      trust: 'verified', services: 'home_repair_service', serviceCategories: 'category',
      about: 'info', whyChooseUs: 'star', statistics: 'bar_chart',
      process: 'account_tree', locations: 'location_on', testimonials: 'reviews',
      faq: 'help', contact: 'contact_mail', footer: 'web', socialLinks: 'share', seo: 'search',
    };
    return icons[key] || 'article';
  }

  getSectionLabel(key: string): string {
    const labels: Record<string, string> = {
      company: 'Company Info', navigation: 'Navigation', hero: 'Hero Section',
      trust: 'Trust Badges', services: 'Services', serviceCategories: 'Service Categories',
      about: 'About Us', whyChooseUs: 'Why Choose Us', statistics: 'Statistics',
      process: 'Process Steps', locations: 'Locations', testimonials: 'Testimonials',
      faq: 'FAQ', contact: 'Contact Info', footer: 'Footer', socialLinks: 'Social Links', seo: 'SEO',
    };
    return labels[key] || key;
  }

  getSectionDesc(key: string): string {
    const data = this.sections()[key];
    if (Array.isArray(data)) return `${data.length} items`;
    if (typeof data === 'object' && data !== null) return `${Object.keys(data).length} fields`;
    return '';
  }
}
