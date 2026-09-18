import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InvoiceService, Invoice } from '../../services/invoice.service';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';

@Component({
  selector: 'app-admin-invoice-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './invoice-list.component.html',
  styleUrl: '../erp-shared.css',
})
export class AdminInvoiceListComponent implements OnInit {
  private invoiceService = inject(InvoiceService);

  sidebarCollapsed = false;
  mobileMenuOpen = false;

  invoices = signal<Invoice[]>([]);
  loading = signal(true);
  search = signal('');
  filterStatus = signal('');
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);

  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  ngOnInit() {
    this.loadInvoices();
  }

  async loadInvoices() {
    this.loading.set(true);
    try {
      const res = await this.invoiceService.list({
        page: this.currentPage(),
        limit: 15,
        search: this.search(),
        status: this.filterStatus(),
      });
      this.invoices.set(res.data);
      this.total.set(res.pagination.total);
      this.totalPages.set(res.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadInvoices();
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadInvoices();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadInvoices();
    }
  }

  customerName(inv: Invoice): string {
    const c = inv.customerId as any;
    return c?.companyName || '-';
  }

  money(n: number | null | undefined): string {
    return (n ?? 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'DRAFT': return 'erp-badge erp-badge--draft';
      case 'APPROVED': return 'erp-badge erp-badge--approved';
      case 'CANCELLED': return 'erp-badge erp-badge--cancelled';
      default: return 'erp-badge';
    }
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
