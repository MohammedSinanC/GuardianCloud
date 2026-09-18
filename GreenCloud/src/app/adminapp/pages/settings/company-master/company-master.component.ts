import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../../../core/services/http-client.service';
import { PermissionService } from '../../../../core/services/permission.service';

interface Company {
  _id: string;
  name: string;
  tagline: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  workingHours: string;
  yearEstablished: number;
  code: string;
  logo: string;
  favicon: string;
  website: string;
  taxNumber: string;
  commercialRegistration: string;
  vatPercentage: number;
  currency: string;
  isActive: boolean;
}

interface ContentGroup {
  key: string;
  label: string;
  icon: string;
  type: 'object' | 'array';
  fields: string[];
}

@Component({
  selector: 'app-company-master',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-master.component.html',
  styleUrls: ['../shared-master.css', './company-master.component.css'],
})
export class CompanyMasterComponent implements OnInit {
  private http = inject(HttpClientService);
  private perm = inject(PermissionService);

  activeTab = signal<'company' | 'content'>('company');
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  success = signal('');
  isEditMode = signal(false);
  company: Company | null = null;
  form = {
    name: '',
    code: '',
    tagline: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    workingHours: '',
    yearEstablished: null as number | null,
    logo: '',
    favicon: '',
    website: '',
    taxNumber: '',
    commercialRegistration: '',
    vatPercentage: 5,
    currency: 'AED',
    isActive: true,
  };

  // Content state
  contentLoading = signal(true);
  contentSaving = signal(false);
  contentError = signal('');
  contentSuccess = signal('');
  sections = signal<any>({});
  selectedGroup = signal<string>('hero');
  editingItem = signal<any>(null);
  showAddDialog = signal(false);
  showDeleteDialog = signal(false);
  deleteTarget = signal<any>(null);
  editForm: any = {};
  editIndex = signal<number>(-1);

  groups: ContentGroup[] = [
    {
      key: 'hero',
      label: 'Hero Section',
      icon: 'featured_play_list',
      type: 'object',
      fields: [
        'title',
        'subtitle',
        'badgeText',
        'primaryCtaText',
        'primaryCtaRoute',
        'secondaryCtaText',
        'secondaryCtaRoute',
      ],
    },
    {
      key: 'trust',
      label: 'Trust Badges',
      icon: 'verified',
      type: 'array',
      fields: ['icon', 'title', 'value'],
    },
    {
      key: 'services',
      label: 'Services',
      icon: 'home_repair_service',
      type: 'array',
      fields: ['id', 'name', 'shortDescription', 'category', 'icon', 'image'],
    },
    // { key: 'serviceCategories', label: 'Service Categories', icon: 'category', type: 'array', fields: ['id', 'name', 'description', 'icon'] },
    {
      key: 'about',
      label: 'About Us',
      icon: 'info',
      type: 'object',
      fields: ['title', 'description', 'image', 'mission', 'vision'],
    },
    {
      key: 'whyChooseUs',
      label: 'Why Choose Us',
      icon: 'star',
      type: 'array',
      fields: ['icon', 'title', 'description'],
    },
    {
      key: 'statistics',
      label: 'Statistics',
      icon: 'bar_chart',
      type: 'array',
      fields: ['icon', 'value', 'label'],
    },
    {
      key: 'process',
      label: 'Process Steps',
      icon: 'account_tree',
      type: 'array',
      fields: ['step', 'title', 'description', 'icon'],
    },
    {
      key: 'locations',
      label: 'Locations',
      icon: 'location_on',
      type: 'array',
      fields: ['name', 'address', 'phone', 'image'],
    },
    {
      key: 'testimonials',
      label: 'Testimonials',
      icon: 'reviews',
      type: 'array',
      fields: ['name', 'role', 'text', 'rating', 'image'],
    },
    {
      key: 'faq',
      label: 'FAQ',
      icon: 'help',
      type: 'array',
      fields: ['question', 'answer'],
    },
    {
      key: 'contact',
      label: 'Contact Info',
      icon: 'contact_mail',
      type: 'object',
      fields: [
        'title',
        'description',
        'phone',
        'email',
        'address',
        'workingHours',
      ],
    },
    {
      key: 'navigation',
      label: 'Navigation',
      icon: 'menu',
      type: 'object',
      fields: ['logo', 'logoAlt'],
    },
    {
      key: 'footer',
      label: 'Footer',
      icon: 'web',
      type: 'object',
      fields: ['companyName', 'description'],
    },
    {
      key: 'socialLinks',
      label: 'Social Links',
      icon: 'share',
      type: 'array',
      fields: ['platform', 'url', 'icon'],
    },
    {
      key: 'seo',
      label: 'SEO',
      icon: 'search',
      type: 'object',
      fields: ['title', 'description', 'keywords'],
    },
    {
      key: 'company',
      label: 'Company (DB)',
      icon: 'business',
      type: 'object',
      fields: ['name', 'tagline'],
    },
  ];

  get canEdit(): boolean {
    return this.perm.hasPermission('companiesPage', 'edit');
  }

  selectedGroupValue = 'hero';
  get currentGroup(): ContentGroup | undefined {
    return this.groups.find((g) => g.key === this.selectedGroup());
  }
  get currentData(): any {
    return this.sections()[this.selectedGroup()];
  }
  get isArray(): boolean {
    return this.currentGroup?.type === 'array';
  }
  get items(): any[] {
    return Array.isArray(this.currentData) ? this.currentData : [];
  }

  ngOnInit() {
    this.loadCompany();
    this.loadContent();
  }

  // ===== COMPANY =====
  async loadCompany() {
    this.loading.set(true);
    try {
      const res: any = await firstValueFrom(this.http.get('/companies'));
      if (res.success && res.data?.length > 0) {
        this.company = res.data[0];
        this.populateForm(res.data[0]);
      }
    } catch {
      this.error.set('Failed to load company');
    } finally {
      this.loading.set(false);
    }
  }

  populateForm(c: Company) {
    this.form = {
      name: c.name || '',
      code: c.code || '',
      tagline: c.tagline || '',
      email: c.email || '',
      phone: c.phone || '',
      whatsapp: c.whatsapp || '',
      address: c.address || '',
      workingHours: c.workingHours || '',
      yearEstablished: c.yearEstablished || null,
      logo: c.logo || '',
      favicon: c.favicon || '',
      website: c.website || '',
      taxNumber: c.taxNumber || '',
      commercialRegistration: c.commercialRegistration || '',
      vatPercentage: c.vatPercentage ?? 5,
      currency: c.currency || 'AED',
      isActive: c.isActive,
    };
  }

  enterEditMode() {
    if (this.company) this.populateForm(this.company);
    this.isEditMode.set(true);
    this.error.set('');
    this.success.set('');
  }
  cancelEdit() {
    if (this.company) this.populateForm(this.company);
    this.isEditMode.set(false);
    this.error.set('');
  }

  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0]) return;
    if (input.files[0].size > 5 * 1024 * 1024) {
      this.error.set('Logo max 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.form.logo = reader.result as string;
    };
    reader.readAsDataURL(input.files[0]);
  }

  removeLogo() {
    this.form.logo = '';
  }

  async saveCompany() {
    if (!this.form.name || !this.form.code) {
      this.error.set('Name and code required');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      if (this.company)
        await firstValueFrom(
          this.http.put(`/companies/${this.company._id}`, this.form),
        );
      else await firstValueFrom(this.http.post('/companies', this.form));
      this.success.set('Company saved');
      this.isEditMode.set(false);
      await this.loadCompany();
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  // ===== CONTENT =====
  async loadContent() {
    this.contentLoading.set(true);
    try {
      const res: any = await firstValueFrom(this.http.get('/content'));
      if (res.success) this.sections.set(res.data || {});
    } catch {
      this.sections.set({});
    } finally {
      this.contentLoading.set(false);
    }
  }

  selectGroup(key: string) {
    this.selectedGroup.set(key);
    this.editingItem.set(null);
    this.showAddDialog.set(false);
  }

  // Edit item
  openEditItem(item: any, index: number) {
    this.editIndex.set(index);
    this.editForm = { ...item };
    this.editingItem.set(item);
  }

  cancelEditItem() {
    this.editingItem.set(null);
    this.editForm = {};
  }

  async saveEditItem() {
    const key = this.selectedGroup();
    const idx = this.editIndex();
    if (!key || idx < 0) return;
    this.contentSaving.set(true);
    try {
      const data = [...this.items];
      data[idx] = { ...this.editForm };
      await firstValueFrom(
        this.http.put(`/content/${key}`, { data, section: key }),
      );
      this.sections.update((s) => ({ ...s, [key]: data }));
      this.contentSuccess.set('Item updated');
      this.editingItem.set(null);
    } catch (err: any) {
      this.contentError.set(err?.error?.message || 'Failed');
    } finally {
      this.contentSaving.set(false);
    }
  }

  // Add item
  openAddItem() {
    this.editForm = {};
    this.currentGroup?.fields.forEach((f) => {
      this.editForm[f] = '';
    });
    this.showAddDialog.set(true);
  }

  cancelAddItem() {
    this.showAddDialog.set(false);
    this.editForm = {};
  }

  async saveAddItem() {
    const key = this.selectedGroup();
    if (!key) return;
    this.contentSaving.set(true);
    try {
      const data = [...this.items, { ...this.editForm }];
      await firstValueFrom(
        this.http.put(`/content/${key}`, { data, section: key }),
      );
      this.sections.update((s) => ({ ...s, [key]: data }));
      this.contentSuccess.set('Item added');
      this.showAddDialog.set(false);
    } catch (err: any) {
      this.contentError.set(err?.error?.message || 'Failed');
    } finally {
      this.contentSaving.set(false);
    }
  }

  // Delete item
  openDeleteItem(item: any, index: number) {
    this.deleteTarget.set({ item, index });
    this.showDeleteDialog.set(true);
  }
  cancelDelete() {
    this.showDeleteDialog.set(false);
    this.deleteTarget.set(null);
  }

  async confirmDelete() {
    const key = this.selectedGroup();
    const target = this.deleteTarget();
    if (!key || !target) return;
    this.contentSaving.set(true);
    try {
      const data = this.items.filter((_: any, i: number) => i !== target.index);
      await firstValueFrom(
        this.http.put(`/content/${key}`, { data, section: key }),
      );
      this.sections.update((s) => ({ ...s, [key]: data }));
      this.contentSuccess.set('Item deleted');
      this.showDeleteDialog.set(false);
    } catch (err: any) {
      this.contentError.set(err?.error?.message || 'Failed');
    } finally {
      this.contentSaving.set(false);
    }
  }

  // Save entire object section
  editObjectJson = '';
  openObjectEdit() {
    this.editObjectJson = JSON.stringify(this.currentData || {}, null, 2);
    this.editingItem.set({ _type: 'object' });
  }
  async saveObjectEdit() {
    const key = this.selectedGroup();
    if (!key) return;
    this.contentSaving.set(true);
    try {
      const data = JSON.parse(this.editObjectJson);
      await firstValueFrom(
        this.http.put(`/content/${key}`, { data, section: key }),
      );
      this.sections.update((s) => ({ ...s, [key]: data }));
      this.contentSuccess.set('Section saved');
      this.editingItem.set(null);
    } catch (err: any) {
      this.contentError.set(
        err instanceof SyntaxError
          ? 'Invalid JSON'
          : err?.error?.message || 'Failed',
      );
    } finally {
      this.contentSaving.set(false);
    }
  }

  getGroupCount(key: string): number {
    const data = this.sections()[key];
    if (Array.isArray(data)) return data.length;
    if (typeof data === 'object' && data !== null)
      return Object.keys(data).length;
    return 0;
  }

  getSectionDesc(key: string): string {
    const descs: Record<string, string> = {
      hero: 'Homepage banner, title, subtitle, CTA buttons',
      trust: 'Trust badges — years, clients, certifications',
      services: 'All services offered by the company',
      serviceCategories: 'Service grouping and categories',
      about: 'About us section, mission, vision',
      whyChooseUs: 'Key reasons customers should choose us',
      statistics: 'Counter numbers — projects, clients, awards',
      process: 'Step-by-step workflow process',
      locations: 'Office and branch locations',
      testimonials: 'Customer reviews and ratings',
      faq: 'Frequently asked questions and answers',
      contact: 'Contact details — phone, email, address',
      navigation: 'Top navigation bar logo and links',
      footer: 'Footer content and company info',
      socialLinks: 'Social media platform links',
      seo: 'Page title, description, keywords for SEO',
      company: 'Company info synced from MongoDB',
    };
    return descs[key] || '';
  }

  onFieldImageSelected(event: Event, target: any, field: string) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      this.contentError.set('Image must be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      target[field] = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  getFieldValue(item: any, field: string): string {
    const val = item[field];
    if (val === undefined || val === null) return '-';
    if (typeof val === 'string' && val.length > 60)
      return val.substring(0, 60) + '...';
    return String(val);
  }
}
