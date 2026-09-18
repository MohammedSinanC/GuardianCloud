import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LeadService, Lead } from '../../services/lead.service';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-admin-lead-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './lead-list.component.html',
  styleUrl: '../erp-shared.css',
})
export class AdminLeadListComponent implements OnInit {
  private leadService = inject(LeadService);
  private confirmService = inject(ConfirmService);
  private router = inject(Router);

  sidebarCollapsed = false;
  mobileMenuOpen = false;

  leads = signal<Lead[]>([]);
  loading = signal(true);
  search = signal('');
  filterStatus = signal('');
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);
  busyId = signal('');

  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  ngOnInit() {
    this.loadLeads();
  }

  async loadLeads() {
    this.loading.set(true);
    try {
      const res = await this.leadService.list({
        page: this.currentPage(),
        limit: 15,
        search: this.search(),
        status: this.filterStatus(),
      });
      this.leads.set(res.data);
      this.total.set(res.pagination.total);
      this.totalPages.set(res.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadLeads();
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadLeads();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadLeads();
    }
  }

  /** Approve directly from the list (DRAFT leads must be submitted first). */
  async approve(lead: Lead) {
    if (lead.status === 'DRAFT') {
      try {
        this.busyId.set(lead._id);
        await this.leadService.submit(lead._id);
        await this.leadService.approve(lead._id);
      } catch (error) {
        console.error('Failed to approve lead:', error);
      } finally {
        this.busyId.set('');
        this.loadLeads();
      }
      return;
    }
    try {
      this.busyId.set(lead._id);
      await this.leadService.approve(lead._id);
    } catch (error) {
      console.error('Failed to approve lead:', error);
    } finally {
      this.busyId.set('');
      this.loadLeads();
    }
  }

  /** Submit a DRAFT lead for approval from the list. */
  async submitLead(lead: Lead) {
    try {
      this.busyId.set(lead._id);
      await this.leadService.submit(lead._id);
    } catch (error) {
      console.error('Failed to submit lead:', error);
    } finally {
      this.busyId.set('');
      this.loadLeads();
    }
  }

  /** Reject from list requires a reason — open the detail page. */
  reject(lead: Lead) {
    this.router.navigate(['/adminapp/leads', lead._id]);
  }

  async deleteDraft(lead: Lead) {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete Lead',
      message: `Delete draft lead ${lead.leadNo}? This cannot be undone.`,
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    try {
      this.busyId.set(lead._id);
      await this.leadService.remove(lead._id);
    } catch (error) {
      console.error('Failed to delete lead:', error);
    } finally {
      this.busyId.set('');
      this.loadLeads();
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'DRAFT': return 'erp-badge erp-badge--draft';
      case 'PENDING_APPROVAL': return 'erp-badge erp-badge--pending';
      case 'APPROVED': return 'erp-badge erp-badge--approved';
      case 'REJECTED': return 'erp-badge erp-badge--rejected';
      default: return 'erp-badge';
    }
  }

  statusLabel(status: string): string {
    return status.replace(/_/g, ' ');
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }
}
