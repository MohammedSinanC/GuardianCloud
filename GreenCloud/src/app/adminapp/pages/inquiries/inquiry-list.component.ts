import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InquiryService, Inquiry } from '../../../core/services/inquiry.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';

@Component({
  selector: 'app-admin-inquiry-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, StatusBadgeComponent, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './inquiry-list.component.html',
  styleUrl: './inquiry-list.component.css',
})
export class AdminInquiryListComponent implements OnInit {
  @Input() title = 'Inquiries';
  @Input() fixedStages = '';
  private inquiryService = inject(InquiryService);
  private route = inject(ActivatedRoute);

  sidebarCollapsed = false;
  mobileMenuOpen = false;

  inquiries = signal<Inquiry[]>([]);
  loading = signal(false);
  search = signal('');
  filterStage = signal('');
  filterStatus = signal('');
  filterUrgency = signal('');
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);

  stageOptions = [
    { value: '', label: 'All Stages' },
    { value: 'CREATED', label: 'Created' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'UNDER_REVIEW', label: 'Under Review' },
    { value: 'INSPECTION_REQUIRED', label: 'Inspection Required' },
    { value: 'INSPECTION_SCHEDULED', label: 'Inspection Scheduled' },
    { value: 'INSPECTION_COMPLETED', label: 'Inspection Completed' },
    { value: 'QUOTATION_PREPARED', label: 'Quotation Prepared' },
    { value: 'QUOTATION_SENT', label: 'Quotation Sent' },
    { value: 'QUOTATION_APPROVED', label: 'Quotation Approved' },
    { value: 'SERVICE_SCHEDULED', label: 'Service Scheduled' },
    { value: 'TECHNICIAN_ASSIGNED', label: 'Technician Assigned' },
    { value: 'SERVICE_IN_PROGRESS', label: 'Service In Progress' },
    { value: 'SERVICE_COMPLETED', label: 'Service Completed' },
    { value: 'INVOICE_GENERATED', label: 'Invoice Generated' },
    { value: 'PAYMENT_PENDING', label: 'Payment Pending' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  ngOnInit() {
    const stage = this.fixedStages || this.route.snapshot.queryParamMap.get('stage');
    if (stage) this.filterStage.set(stage);
    this.loadInquiries();
  }

  async loadInquiries() {
    this.loading.set(true);
    try {
      const response = await this.inquiryService.listInquiries({
        page: this.currentPage(),
        limit: 15,
        search: this.search(),
        stage: this.filterStage(),
        status: this.filterStatus(),
        urgency: this.filterUrgency(),
      });
      if (response.success) {
        // Normalize API rows before rendering. This keeps older records with missing
        // optional fields from producing partially empty table rows.
        const rows = Array.isArray(response.data)
          ? response.data.map((inquiry) => ({
              ...inquiry,
              inquiryNo: inquiry.inquiryNo || '',
              customerName: inquiry.customerName || inquiry.companyName || '',
              mobile: inquiry.mobile || '',
              serviceLocation: inquiry.serviceLocation || inquiry.location || '',
              pestTypes: Array.isArray(inquiry.pestTypes) ? inquiry.pestTypes : [],
              currentStageCode: inquiry.currentStageCode || inquiry.status || 'UNKNOWN',
              urgency: inquiry.urgency || 'NORMAL',
            }))
          : [];
        this.inquiries.set(rows);
        this.totalPages.set(response.pagination?.totalPages || 1);
        this.total.set(response.pagination?.total || rows.length);
      }
    } catch (error) {
      console.error('Failed to load inquiries:', error);
    } finally {
      this.loading.set(false);
    }
  }

  trackInquiry(index: number, inquiry: Inquiry): string {
    return inquiry?._id || String(index);
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadInquiries();
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadInquiries();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadInquiries();
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }
}
