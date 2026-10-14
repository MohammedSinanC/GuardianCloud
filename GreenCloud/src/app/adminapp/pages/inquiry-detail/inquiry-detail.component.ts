import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InquiryService, Inquiry } from '../../../core/services/inquiry.service';
import { ContentService } from '../../../core/services/content.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';
import { DEFAULT_URGENCY_TYPES } from '../../../core/constants/app.constants';

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
  /** Fields a blocked save/approve reported as missing — shown in red until filled. */
  private missingFields = signal<ReadonlySet<string>>(new Set());

  readonly sources = ['WALK_IN', 'REFERRAL', 'WEBSITE', 'PHONE', 'CAMPAIGN', 'OTHER'];
  readonly preferredTimes = ['MORNING', 'AFTERNOON', 'EVENING', 'ANY'];
  readonly serviceTypes = computed(() => this.contentService.serviceTypes());
  readonly locations = computed(() => this.contentService.locations());
  readonly pestTypeOptions = computed(() => this.contentService.pestTypes());
  /** Urgency options are owned by the "Urgency Types" master (Settings). */
  readonly urgencyOptions = computed<{ code: string; label: string }[]>(() => {
    const master = this.contentService.urgencyTypes();
    return master.length ? master : DEFAULT_URGENCY_TYPES;
  });
  /** Site profile options, each owned by its own master (Settings). */
  readonly propertyTypeOptions = computed(() => this.contentService.propertyTypes());
  readonly populationLevelOptions = computed(() => this.contentService.populationLevels());
  readonly entryPointOptions = computed(() => this.contentService.entryPoints());

  canAct = computed(() => {
    const status = this.inquiry()?.status;
    return ['CREATED', 'SUBMITTED', 'DRAFT', 'PENDING_APPROVAL'].includes(status || '');
  });

  /** True while the named field is one the last blocked save reported missing. */
  isMissing(field: string): boolean {
    return this.missingFields().has(field);
  }

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
    this.clearFilledHighlights();
  }

  updateLocation(value: string) {
    const current = this.inquiry();
    if (!current) return;
    this.inquiry.set({ ...current, serviceLocation: value, location: value });
    this.clearFilledHighlights();
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

  /** Resolves a stored master code to its label for read-only display. */
  masterLabel(options: { code: string; label: string }[], code: string | null | undefined): string {
    if (!code) return '-';
    return options.find((o) => o.code === code)?.label || code.replace(/_/g, ' ');
  }

  urgencyLabel(code: string | null | undefined): string {
    return this.masterLabel(this.urgencyOptions(), code);
  }

  /**
   * Slots offered for Preferred Time, plus the stored value when it isn't one of
   * them. The customer portal saves a real clock time ("14:30"), so a picked-up
   * request must keep showing — and keep — exactly what the customer asked for.
   */
  preferredTimeOptions(): { value: string; label: string }[] {
    const options = this.preferredTimes.map((value) => ({ value, label: this.sourceLabel(value) }));
    const stored = this.inquiry()?.preferredTime?.trim();
    if (stored && !options.some((option) => option.value === stored)) {
      options.push({ value: stored, label: stored });
    }
    return options;
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
      urgency: current.urgency || '',
      propertyType: current.propertyType || '',
      populationLevel: current.populationLevel || '',
      entryPoints: current.entryPoints || '',
      siteInspectionRequired: this.siteInspectionRequired,
      remarks: current.remarks || '',
    };
  }

  /** Interactive "Save as Draft": refuse to persist an incomplete record. */
  async saveDraft() {
    if (this.blockWhenIncomplete()) return;
    await this.persistDraft({ toastAction: 'inquiry.draft' });
  }

  /** Writes the form to the draft endpoint; callers own the completeness gate. */
  private async persistDraft(options?: {
    toastAction?: string;
  }): Promise<void> {
    const current = this.inquiry();
    if (!current || !this.canAct()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const response = await this.inquiryService.saveDraft(
        current._id,
        this.draftPayload(),
        options,
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

  /**
   * The fields an inquiry must carry to be saved or approved — one source of
   * truth for the message text, the red highlights, and the template bindings.
   * Key matches the inquiry property (and the `isMissing(...)` call in the form),
   * and the group is the card the field lives in, so each card can report its own
   * gaps right above the fields. "Location" is satisfied by either serviceLocation
   * or location, so it keys on serviceLocation, which is what the dropdown writes.
   */
  private static readonly MANDATORY_FIELDS: ReadonlyArray<[string, string, 'customer' | 'service']> = [
    ['contactPerson', 'Contact Person', 'customer'],
    ['mobile', 'Mobile Number', 'customer'],
    ['email', 'Email', 'customer'],
    ['propertyType', 'Type of Property', 'customer'],
    ['entryPoints', 'Possible Entry Point', 'customer'],
    ['serviceType', 'Service Type', 'service'],
    ['serviceLocation', 'Location', 'service'],
    ['preferredDate', 'Preferred Date', 'service'],
    ['preferredTime', 'Preferred Time', 'service'],
    ['urgency', 'Urgency', 'service'],
  ];

  /**
   * Labels of the missing fields in one card, in form order. Empty when that card
   * is complete, which is what hides its alert.
   */
  missingIn(group: 'customer' | 'service'): string[] {
    const missing = this.missingFields();
    return AdminInquiryDetailComponent.MANDATORY_FIELDS
      .filter(([key, , fieldGroup]) => fieldGroup === group && missing.has(key))
      .map(([, label]) => label);
  }

  /** Keys of the mandatory fields that are currently empty. */
  private missingFieldKeys(): string[] {
    const current = this.inquiry();
    if (!current) return [];
    const has = (value: string | null | undefined) => !!value?.trim();
    const filled: Record<string, boolean> = {
      contactPerson: has(current.contactPerson),
      mobile: has(current.mobile),
      email: has(current.email),
      propertyType: has(current.propertyType),
      entryPoints: has(current.entryPoints),
      serviceType: has(current.serviceType),
      serviceLocation: has(current.serviceLocation) || has(current.location),
      preferredDate: has(current.preferredDate),
      preferredTime: has(current.preferredTime),
      urgency: has(current.urgency),
    };
    return AdminInquiryDetailComponent.MANDATORY_FIELDS
      .filter(([key]) => !filled[key])
      .map(([key]) => key);
  }

  /**
   * Blocks a save/approve when the record is incomplete. The gaps are named in an
   * alert at the top of the card that owns them and the fields themselves turn red;
   * this page-level state stays clear so the two never show the same message twice.
   * Returns true when the caller must stop.
   */
  private blockWhenIncomplete(): boolean {
    const keys = this.missingFieldKeys();
    if (!keys.length) {
      this.missingFields.set(new Set());
      return false;
    }
    this.missingFields.set(new Set(keys));
    this.error.set('');
    return true;
  }

  /** Drops the red mark from a field once it holds a value — but never adds new ones. */
  private clearFilledHighlights(): void {
    const shown = this.missingFields();
    if (!shown.size) return;
    const stillMissing = new Set(this.missingFieldKeys());
    this.missingFields.set(new Set([...shown].filter((key) => stillMissing.has(key))));
  }

  async approve() {
    const current = this.inquiry();
    if (!current || !this.canAct()) return;
    if (this.blockWhenIncomplete()) return;
    this.approving.set(true);
    this.error.set('');
    try {
      // Persist every edited field before running the server-side approval path
      // (approve() already ran the completeness gate that persistDraft relies on).
      await this.persistDraft();
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
