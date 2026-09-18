import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LeadService, Lead } from '../../services/lead.service';
import { CustomerService, ErpCustomer } from '../../services/customer.service';
import { ContentService } from '../../../core/services/content.service';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';

@Component({
  selector: 'app-admin-lead-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './lead-detail.component.html',
  styleUrl: '../erp-shared.css',
})
export class AdminLeadDetailComponent implements OnInit {
  private leadService = inject(LeadService);
  private customerService = inject(CustomerService);
  private contentService = inject(ContentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  sidebarCollapsed = false;
  mobileMenuOpen = false;

  isNew = signal(false);
  isEditing = signal(false);
  loading = signal(true);
  saving = signal(false);
  busy = signal(false);
  error = signal('');
  showRejectDialog = signal(false);
  rejectReason = signal('');

  lead = signal<Lead | null>(null);
  approveResult = signal<any>(null);
  existingCustomers = signal<ErpCustomer[]>([]);
  selectedCustomerId = signal('');
  loadingCustomers = signal(false);

  form: any = this.emptyForm();

  readonly sources = ['WALK_IN', 'REFERRAL', 'WEBSITE', 'PHONE', 'CAMPAIGN', 'OTHER'];
  readonly times = ['MORNING', 'AFTERNOON', 'EVENING', 'ANY'];
  readonly locations = computed(() => this.contentService.locations());

  statusLabel = computed(() => (this.lead()?.status || '').replace(/_/g, ' '));

  ngOnInit() {
    this.contentService.loadContent();
    this.loadExistingCustomers();
    this.route.paramMap.subscribe(async (params) => {
      const id = params.get('id');
      if (!id || id === 'new') {
        this.isNew.set(true);
        this.isEditing.set(true);
        this.form = this.emptyForm();
        this.loading.set(false);
        return;
      }
      this.isNew.set(false);
      await this.loadLead(id);
    });
  }

  private emptyForm() {
    return {
      companyName: '',
      contactPerson: '',
      mobile: '',
      email: '',
      address: '',
      location: '',
      source: 'WEBSITE',
      serviceRequired: '',
      preferredDate: '',
      preferredTime: 'ANY',
      description: '',
      notes: '',
    };
  }

  async loadLead(id: string) {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.leadService.getById(id);
      this.lead.set(res.data);
      this.selectedCustomerId.set(res.data.customerId || '');
      this.form = this.formFromLead(res.data);
      this.isEditing.set(['DRAFT', 'PENDING_APPROVAL', 'REJECTED'].includes(res.data.status));
    } catch (err: any) {
      this.error.set(err?.message || 'Lead not found');
    } finally {
      this.loading.set(false);
    }
  }

  startEdit() {
    const l = this.lead();
    if (!l) return;
    this.form = this.formFromLead(l);
    this.isEditing.set(true);
  }

  cancelEdit() {
    if (this.isNew()) {
      this.router.navigate(['/adminapp/leads']);
      return;
    }
    this.isEditing.set(false);
  }

  async saveDraft() {
    this.error.set('');
    const wasNew = this.isNew();
    this.form.status = 'DRAFT';
    this.saving.set(true);
    try {
      const saved = await this.persistForm({ toastAction: wasNew ? 'lead.create' : 'lead.update' });
      if (wasNew && saved) {
        await this.router.navigate(['/adminapp/leads', saved._id]);
      }
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Unable to save the lead.');
    } finally {
      this.saving.set(false);
    }
  }

  private async persistForm(options?: { toastAction?: string }): Promise<Lead | null> {
    const payload: any = {
      ...this.form,
      customerId: this.selectedCustomerId() || undefined,
    };

    if (this.isNew()) {
      const res = await this.leadService.create(payload, options);
      this.lead.set(res.data);
      this.isNew.set(false);
      return res.data;
    }

    const current = this.lead();
    if (!current) return null;
    const res = await this.leadService.update(current._id, payload, options);
    this.lead.set(res.data);
    this.form = this.formFromLead(res.data);
    return res.data;
  }

  async approveLead() {
    const missing = this.mandatoryMissing();
    if (missing.length) {
      this.error.set(`Missing mandatory fields: ${missing.join(', ')}`);
      return;
    }

    this.busy.set(true);
    this.error.set('');
    try {
      // Save and submit silently. Only the final approval displays a toast.
      const saved = await this.persistForm();
      if (!saved) return;

      if (saved.status === 'DRAFT') {
        await this.leadService.submit(saved._id);
      } else if (saved.status === 'REJECTED') {
        await this.leadService.update(saved._id, { ...this.form, resubmit: true });
      }

      const result = await this.leadService.approve(
        saved._id,
        this.selectedCustomerId() || undefined,
        { toastAction: 'lead.approve' },
      );
      this.approveResult.set(result);
      await this.router.navigate(['/adminapp/leads']);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Unable to approve lead.');
    } finally {
      this.busy.set(false);
    }
  }

  /** Backward-compatible save method for existing template callers. */
  async save(submitAfter: boolean) {
    if (submitAfter) {
      await this.approveLead();
    } else {
      await this.saveDraft();
    }
  }

  private mandatoryMissing(): string[] {
    const missing: string[] = [];
    if (!this.form.companyName?.trim()) missing.push('Company name');
    if (!this.form.contactPerson?.trim()) missing.push('Contact person');
    if (!this.form.mobile?.trim()) missing.push('Mobile');
    if (!this.form.serviceRequired?.trim()) missing.push('Service required');
    return missing;
  }

  async submit() {
    const l = this.lead();
    if (!l) return;
    this.busy.set(true);
    try {
      await this.leadService.submit(l._id, { toastAction: 'lead.submit' });
      await this.loadLead(l._id);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Unable to submit the lead.');
    } finally {
      this.busy.set(false);
    }
  }

  /** Approve an already submitted lead. */
  async approve() {
    const l = this.lead();
    if (!l) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const res = await this.leadService.approve(
        l._id,
        this.selectedCustomerId() || undefined,
        { toastAction: 'lead.approve' },
      );
      this.approveResult.set(res);
      await this.router.navigate(['/adminapp/leads']);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Unable to approve the lead.');
    } finally {
      this.busy.set(false);
    }
  }

  openRejectDialog() {
    this.rejectReason.set('');
    this.showRejectDialog.set(true);
  }

  async confirmReject() {
    const l = this.lead();
    if (!l) return;
    const reason = this.rejectReason().trim();
    if (!reason) {
      this.error.set('Rejection reason is required.');
      return;
    }

    this.busy.set(true);
    try {
      // Save and submit silently; the reject request is the only toast.
      const saved = await this.persistForm();
      if (!saved) return;
      if (saved.status === 'DRAFT') {
        await this.leadService.submit(saved._id);
      }
      await this.leadService.reject(saved._id, reason, { toastAction: 'lead.reject' });
      this.showRejectDialog.set(false);
      await this.loadLead(saved._id);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Unable to reject the lead.');
    } finally {
      this.busy.set(false);
    }
  }

  async resubmit() {
    const l = this.lead();
    if (!l) return;
    this.busy.set(true);
    try {
      await this.leadService.update(l._id, { ...this.formFromLead(l), resubmit: true }, { toastAction: 'lead.update' });
      await this.loadLead(l._id);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Unable to resubmit the lead.');
    } finally {
      this.busy.set(false);
    }
  }

  private async loadExistingCustomers() {
    this.loadingCustomers.set(true);
    try {
      this.existingCustomers.set(await this.customerService.listAll());
    } catch (err) {
      console.error('Failed to load existing customers:', err);
    } finally {
      this.loadingCustomers.set(false);
    }
  }

  clearCustomerLink() {
    this.selectedCustomerId.set('');
  }

  selectedCustomer(): ErpCustomer | undefined {
    return this.existingCustomers().find((customer) => customer._id === this.selectedCustomerId());
  }

  private formFromLead(l: Lead): any {
    return {
      companyName: l.companyName || '',
      contactPerson: l.contactPerson || '',
      mobile: l.mobile || '',
      email: l.email || '',
      address: l.address || '',
      location: l.location || '',
      source: l.source || 'WEBSITE',
      serviceRequired: l.serviceRequired || '',
      preferredDate: l.preferredDate ? l.preferredDate.substring(0, 10) : '',
      preferredTime: l.preferredTime || 'ANY',
      description: l.description || '',
      notes: l.notes || '',
    };
  }

  async deleteDraft() {
    const l = this.lead();
    if (!l) return;
    this.busy.set(true);
    try {
      await this.leadService.remove(l._id);
      this.router.navigate(['/adminapp/leads']);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Unable to delete the lead.');
    } finally {
      this.busy.set(false);
    }
  }

  canReject(): boolean {
    return !this.isNew() && ['DRAFT', 'PENDING_APPROVAL'].includes(this.lead()?.status || '');
  }

  sourceLabel(s: string): string {
    return (s || '').replace(/_/g, ' ');
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  statusClass(status: string | undefined): string {
    switch (status) {
      case 'DRAFT': return 'erp-badge erp-badge--draft';
      case 'PENDING_APPROVAL': return 'erp-badge erp-badge--pending';
      case 'APPROVED': return 'erp-badge erp-badge--approved';
      case 'REJECTED': return 'erp-badge erp-badge--rejected';
      default: return 'erp-badge';
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }
}
