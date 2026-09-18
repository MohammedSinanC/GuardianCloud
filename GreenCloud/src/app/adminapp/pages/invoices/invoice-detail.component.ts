import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InvoiceService, Invoice } from '../../services/invoice.service';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-admin-invoice-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './invoice-detail.component.html',
  styleUrl: '../erp-shared.css',
})
export class AdminInvoiceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private invoiceService = inject(InvoiceService);
  private confirmService = inject(ConfirmService);

  sidebarCollapsed = false;
  mobileMenuOpen = false;

  loading = signal(true);
  busy = signal(false);
  error = signal('');

  invoice = signal<Invoice | null>(null);

  ngOnInit() {
    this.route.paramMap.subscribe(async (params) => {
      const id = params.get('id');
      if (id) await this.load(id);
    });
  }

  async load(id: string) {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.invoiceService.getById(id);
      this.invoice.set(res.data);
    } catch (err: any) {
      this.error.set(err?.message || 'Invoice not found');
    } finally {
      this.loading.set(false);
    }
  }

  async approve() {
    const inv = this.invoice();
    if (!inv) return;
    this.busy.set(true);
    try {
      await this.invoiceService.approve(inv._id);
      await this.load(inv._id);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Unable to approve the invoice.');
    } finally {
      this.busy.set(false);
    }
  }

  async cancel() {
    const inv = this.invoice();
    if (!inv) return;
    const confirmed = await this.confirmService.confirm({
      title: 'Cancel Invoice',
      message: `Cancel invoice ${inv.invoiceNo}? This cannot be undone.`,
      confirmText: 'Cancel Invoice',
      type: 'danger',
    });
    if (!confirmed) return;
    this.busy.set(true);
    try {
      await this.invoiceService.cancel(inv._id);
      await this.load(inv._id);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Unable to cancel the invoice.');
    } finally {
      this.busy.set(false);
    }
  }

  async downloadPdf() {
    const inv = this.invoice();
    if (!inv) return;
    this.busy.set(true);
    try {
      const blob = await this.invoiceService.downloadPdf(inv._id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inv.invoiceNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF download failed:', error);
      this.error.set('PDF generation failed.');
    } finally {
      this.busy.set(false);
    }
  }

  async sendToCustomer() {
    const inv = this.invoice();
    if (!inv) return;
    this.busy.set(true);
    try {
      await this.invoiceService.sendToCustomer(inv._id);
    } catch (error) {
      console.error('Send failed:', error);
    } finally {
      this.busy.set(false);
    }
  }

  money(n: number | null | undefined): string {
    return (n ?? 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  statusClass(status: string | undefined): string {
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

  refId(ref: any): string {
    return typeof ref === 'string' ? ref : ref?._id || '';
  }

  quotationNo(): string {
    const q = this.invoice()?.quotationId as any;
    return typeof q === 'object' && q ? q.quotationNo || '' : '';
  }

  customerName(): string {
    const c = this.invoice()?.customerId as any;
    return typeof c === 'object' && c ? c.companyName || '' : '';
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }
}
