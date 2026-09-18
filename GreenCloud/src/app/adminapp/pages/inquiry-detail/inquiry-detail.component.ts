import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InquiryService, Inquiry } from '../../../core/services/inquiry.service';
import { ContentService } from '../../../core/services/content.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';

@Component({
  selector: 'app-admin-inquiry-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './inquiry-detail.component.html',
  styleUrl: './inquiry-detail.component.css',
})
export class AdminInquiryDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private inquiryService = inject(InquiryService);
  private contentService = inject(ContentService);

  sidebarCollapsed = false;
  mobileMenuOpen = false;
  inquiry = signal<Inquiry | null>(null);
  loading = signal(true);
  error = signal('');
  saving = signal(false);
  approving = signal(false);
  rejecting = signal(false);
  showRejectDialog = signal(false);
  isEditing = signal(false);
  rejectReason = '';
  siteInspectionRequired = false;
  downstreamType = signal<'INSPECTION' | 'QUOTATION' | ''>('');
  downstreamId = signal('');

  readonly sources = ['WALK_IN', 'REFERRAL', 'WEBSITE', 'PHONE', 'CAMPAIGN', 'OTHER'];
  readonly preferredTimes = ['MORNING', 'AFTERNOON', 'EVENING', 'ANY'];
  readonly serviceTypes = computed(() => this.contentService.serviceTypes());
  readonly locations = computed(() => this.contentService.locations());
  readonly pestTypeOptions = computed(() => this.contentService.pestTypes());

  canAct = computed(() => {
    const status = this.inquiry()?.status;
    return ['CREATED', 'SUBMITTED', 'DRAFT', 'PENDING_APPROVAL'].includes(status || '');
  });

  ngOnInit() {
    this.contentService.loadContent();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadInquiry(id);
  }

  async loadInquiry(id: string) {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.inquiryService.getInquiryById(id);
      if (response.success) {
        this.inquiry.set(response.data);
        this.siteInspectionRequired = response.data.siteInspectionRequired === true;
        this.isEditing.set(['CREATED', 'SUBMITTED', 'DRAFT', 'PENDING_APPROVAL', 'REJECTED'].includes(response.data.status));
      }
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed to load inquiry');
    } finally {
      this.loading.set(false);
    }
  }

  updateField(field: keyof Inquiry, value: any) {
    const current = this.inquiry();
    if (!current) return;
    this.inquiry.set({ ...current, [field]: value });
  }

  updateLocation(value: string) {
    const current = this.inquiry();
    if (!current) return;
    this.inquiry.set({ ...current, serviceLocation: value, location: value });
  }

  masterLocationValue(value: string | null | undefined): string {
    const current = value || '';
    const match = this.locations().find((location) =>
      location.city === current || this.locationLabel(location) === current,
    );
    return match?.city || current;
  }

  inputDate(value: string | null | undefined): string {
    return value ? value.substring(0, 10) : '';
  }

  sourceLabel(value: string | null | undefined): string {
    return (value || '').replace(/_/g, ' ');
  }

  locationLabel(location: any): string {
    if (typeof location === 'string') return location;
    return location?.city || '';
  }

  hasPestType(type: string): boolean {
    return (this.inquiry()?.pestTypes || []).includes(type);
  }

  togglePestType(type: string) {
    const current = [...(this.inquiry()?.pestTypes || [])];
    const next = current.includes(type) ? current.filter((item) => item !== type) : [...current, type];
    const currentInquiry = this.inquiry();
    if (currentInquiry) this.inquiry.set({ ...currentInquiry, pestTypes: next });
  }

  private draftPayload(): Partial<Inquiry> {
    const current = this.inquiry();
    if (!current) return {};
    return {
      customerName: current.customerName || '',
      companyName: current.companyName || '',
      contactPerson: current.contactPerson || '',
      mobile: current.mobile || '',
      email: current.email || '',
      source: current.source || 'WEBSITE',
      serviceType: current.serviceType || '',
      serviceLocation: current.serviceLocation || current.location || '',
      location: current.location || current.serviceLocation || '',
      building: current.building || '',
      unit: current.unit || '',
      area: current.area || '',
      pestTypes: current.pestTypes || [],
      problemDescription: current.problemDescription || '',
      preferredDate: current.preferredDate || null,
      preferredTime: current.preferredTime || '',
      siteInspectionRequired: this.siteInspectionRequired,
      remarks: current.remarks || '',
    };
  }

  async saveDraft(showToast = true) {
    const current = this.inquiry();
    if (!current || !this.canAct()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const response = await this.inquiryService.saveDraft(
        current._id,
        this.draftPayload(),
        showToast ? { toastAction: 'inquiry.draft' } : undefined,
      );
      if (response.success) {
        this.inquiry.set(response.data);
        this.siteInspectionRequired = response.data.siteInspectionRequired === true;
      }
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Unable to save inquiry as draft');
      throw err;
    } finally {
      this.saving.set(false);
    }
  }

  async approve() {
    const current = this.inquiry();
    if (!current || !this.canAct()) return;
    this.approving.set(true);
    this.error.set('');
    try {
      // Persist every edited field before running the server-side approval path.
      await this.saveDraft(false);
      const latest = this.inquiry();
      if (!latest) return;
      const response = await this.inquiryService.approve(latest._id, this.siteInspectionRequired, { toastAction: 'inquiry.approve' });
      if (response.success) {
        this.inquiry.set(response.data);
        this.isEditing.set(false);
        this.downstreamType.set(response.nextType || '');
        this.downstreamId.set(response.nextId || '');
      }
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Unable to approve inquiry');
    } finally {
      this.approving.set(false);
    }
  }

  openRejectDialog() {
    if (!this.canAct()) return;
    this.rejectReason = '';
    this.showRejectDialog.set(true);
  }

  closeRejectDialog() {
    if (!this.rejecting()) this.showRejectDialog.set(false);
  }

  async reject() {
    const inquiry = this.inquiry();
    const reason = this.rejectReason.trim();
    if (!inquiry || !reason || !this.canAct()) return;
    this.rejecting.set(true);
    this.error.set('');
    try {
      const response = await this.inquiryService.reject(inquiry._id, reason, { toastAction: 'inquiry.reject' });
      if (response.success) {
        this.inquiry.set(response.data);
        this.isEditing.set(false);
        this.showRejectDialog.set(false);
      }
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Unable to reject inquiry');
    } finally {
      this.rejecting.set(false);
    }
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  formatDateShort(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }
}
