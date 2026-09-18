import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CustomerService, CustomerDetail } from '../../services/customer.service';
import { LedgerService, LedgerTransaction } from '../../services/ledger.service';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';

@Component({
  selector: 'app-admin-customer-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './customer-detail.component.html',
  styleUrl: '../erp-shared.css',
})
export class AdminCustomerDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private customerService = inject(CustomerService);
  private ledgerService = inject(LedgerService);

  sidebarCollapsed = false;
  mobileMenuOpen = false;

  loading = signal(true);
  error = signal('');
  showLedger = signal(false);
  ledgerLoading = signal(false);

  detail = signal<CustomerDetail | null>(null);
  transactions = signal<LedgerTransaction[]>([]);

  // Ledger filters
  dateFrom = signal('');
  dateTo = signal('');
  txType = signal('');
  referenceNo = signal('');

  readonly txTypes = ['INVOICE', 'PAYMENT', 'CREDIT', 'DEBIT', 'ADJUSTMENT'];

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
      const res = await this.customerService.getById(id);
      this.detail.set(res.data);
    } catch (err: any) {
      this.error.set(err?.message || 'Customer not found');
    } finally {
      this.loading.set(false);
    }
  }

  async openLedger() {
    const d = this.detail();
    if (!d?.customer) return;
    this.showLedger.set(true);
    await this.loadTransactions();
  }

  async loadTransactions() {
    const d = this.detail();
    if (!d?.customer) return;
    this.ledgerLoading.set(true);
    try {
      const res = await this.ledgerService.getTransactions(d.customer._id, {
        dateFrom: this.dateFrom() || undefined,
        dateTo: this.dateTo() || undefined,
        type: this.txType() || undefined,
        referenceNo: this.referenceNo() || undefined,
      });
      this.transactions.set(res.data);
    } catch (error) {
      console.error('Failed to load ledger transactions:', error);
    } finally {
      this.ledgerLoading.set(false);
    }
  }

  txClass(type: string): string {
    switch (type) {
      case 'INVOICE': case 'DEBIT': return 'erp-badge erp-badge--pending';
      case 'PAYMENT': case 'CREDIT': return 'erp-badge erp-badge--approved';
      default: return 'erp-badge';
    }
  }

  money(n: number | null | undefined): string {
    return (n ?? 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
