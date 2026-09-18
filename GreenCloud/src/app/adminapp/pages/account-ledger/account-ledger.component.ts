import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService, ErpCustomer } from '../../services/customer.service';
import { LedgerService, LedgerTransaction, LedgerSummary } from '../../services/ledger.service';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';

@Component({
  selector: 'app-admin-account-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './account-ledger.component.html',
  styleUrl: '../erp-shared.css',
})
export class AdminAccountLedgerComponent implements OnInit {
  private customerService = inject(CustomerService);
  private ledgerService = inject(LedgerService);

  sidebarCollapsed = false;
  mobileMenuOpen = false;

  customers = signal<ErpCustomer[]>([]);
  selectedCustomerId = signal('');
  loadingCustomers = signal(true);
  loadingTx = signal(false);
  searched = signal(false);

  ledger = signal<{ _id: string; openingBalance: number; currentBalance: number } | null>(null);
  summary = signal<LedgerSummary | null>(null);
  transactions = signal<LedgerTransaction[]>([]);

  dateFrom = signal('');
  dateTo = signal('');
  txType = signal('');
  referenceNo = signal('');

  readonly txTypes = ['INVOICE', 'PAYMENT', 'CREDIT', 'DEBIT', 'ADJUSTMENT'];

  ngOnInit() {
    this.loadCustomers();
  }

  async loadCustomers() {
    this.loadingCustomers.set(true);
    try {
      const res = await this.customerService.list({ page: 1, limit: 200 });
      this.customers.set(res.data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      this.loadingCustomers.set(false);
    }
  }

  onCustomerChange() {
    // Clear previous results; user clicks View Ledger to load.
    this.transactions.set([]);
    this.summary.set(null);
    this.ledger.set(null);
    this.searched.set(false);
  }

  async viewLedger() {
    if (!this.selectedCustomerId()) return;
    this.searched.set(true);
    await this.loadTransactions();
  }

  async loadTransactions() {
    const id = this.selectedCustomerId();
    if (!id) return;
    this.loadingTx.set(true);
    try {
      const [ledgerRes, txRes] = await Promise.all([
        this.ledgerService.getLedger(id),
        this.ledgerService.getTransactions(id, {
          dateFrom: this.dateFrom() || undefined,
          dateTo: this.dateTo() || undefined,
          type: this.txType() || undefined,
          referenceNo: this.referenceNo() || undefined,
        }),
      ]);
      this.ledger.set(ledgerRes.data.ledger);
      this.summary.set(ledgerRes.data.summary);
      this.transactions.set(txRes.data);
    } catch (error) {
      console.error('Failed to load ledger:', error);
    } finally {
      this.loadingTx.set(false);
    }
  }

  selectedCustomer(): ErpCustomer | undefined {
    return this.customers().find((c) => c._id === this.selectedCustomerId());
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
