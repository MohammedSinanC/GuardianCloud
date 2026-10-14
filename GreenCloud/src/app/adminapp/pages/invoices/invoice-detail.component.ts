import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InvoiceService, Invoice, InvoiceScheduleResponse, InvoiceScheduleRow, PaymentReceipt } from '../../services/invoice.service';
import { PaymentService } from '../../services/payment.service';
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
  private paymentService = inject(PaymentService);
  private confirmService = inject(ConfirmService);

  sidebarCollapsed = false;
  mobileMenuOpen = false;

  loading = signal(true);
  busy = signal(false);
  error = signal('');

  invoice = signal<Invoice | null>(null);

  // ===== Payment & Collection workflow =====
  paymentTypes = signal<any[]>([]);
  selectedPaymentTypeId = signal('');
  schedule = signal<InvoiceScheduleRow[]>([]);
  scheduleSummary = signal<InvoiceScheduleResponse['data']['summary'] | null>(null);
  receipts = signal<PaymentReceipt[]>([]);
  scheduleLoading = signal(false);

  // Receive-payment dialog state
  payDialog = signal(false);
  payRow = signal<InvoiceScheduleRow | null>(null);
  payAmount = signal<number | null>(null);
  payMethod = signal('BANK_TRANSFER');
  payReference = signal('');
  payRemarks = signal('');
  payDate = signal('');

  paymentMethods = ['BANK_TRANSFER', 'CASH', 'CARD', 'CHEQUE', 'ONLINE', 'OTHER'];

  canSelectPaymentType(): boolean {
    return ['DRAFT', 'PENDING_APPROVAL'].includes(this.invoice()?.status || '');
  }

  /** Approval requires payment type + schedule present (totals enforced server-side too). */
  scheduleReady(): boolean {
    const inv = this.invoice();
    return !!inv?.paymentTypeId && this.schedule().length > 0;
  }

  async loadPaymentTypes() {
    try {
      const res = await this.paymentService.getPaymentTypes().toPromise();
      this.paymentTypes.set((res?.data || []).filter((t: any) => t.isActive));
    } catch {
      this.paymentTypes.set([]);
    }
  }

  async loadPaymentSchedule() {
    const inv = this.invoice();
    if (!inv) return;
    this.scheduleLoading.set(true);
    try {
      const res = await this.invoiceService.getPaymentSchedule(inv._id);
      this.schedule.set(res.data.schedule || []);
      this.scheduleSummary.set(res.data.summary || null);
      this.receipts.set(res.data.receipts || []);
      if (inv.paymentTypeId) this.selectedPaymentTypeId.set(String(inv.paymentTypeId));
    } catch {
      this.schedule.set([]);
    } finally {
      this.scheduleLoading.set(false);
    }
  }

  async selectPaymentType(id: string) {
    const inv = this.invoice();
    if (!inv || !id) return;
    const replacing = this.schedule().length > 0;
    if (replacing) {
      const confirmed = await this.confirmService.confirm({
        title: 'Change Payment Type',
        message: 'Changing the payment type regenerates the payment schedule. Paid and partially-paid installments are kept.',
        confirmText: 'Change & Regenerate',
        type: 'warning',
      });
      if (!confirmed) {
        this.selectedPaymentTypeId.set(String(inv.paymentTypeId || ''));
        return;
      }
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.invoiceService.selectPaymentType(inv._id, id);
      await this.load(id);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Unable to select the payment type.');
      this.selectedPaymentTypeId.set(String(inv.paymentTypeId || ''));
    } finally {
      this.busy.set(false);
    }
  }

  scheduleStatusClass(s: InvoiceScheduleRow): string {
    switch (s.derivedStatus) {
      case 'PAID': return 'erp-badge erp-badge--approved';
      case 'PARTIALLY_PAID': return 'erp-badge erp-badge--pending';
      case 'OVERDUE': return 'erp-badge erp-badge--rejected';
      case 'GRACE_PERIOD': return 'erp-badge erp-badge--pending';
      case 'CANCELLED': return 'erp-badge erp-badge--cancelled';
      default: return 'erp-badge erp-badge--draft';
    }
  }

  scheduleStatusLabel(s: InvoiceScheduleRow): string {
    switch (s.derivedStatus) {
      case 'GRACE_PERIOD': return 'IN GRACE';
      case 'PARTIALLY_PAID': return 'PARTIAL';
      default: return s.derivedStatus;
    }
  }

  // ===== Receive Payment dialog =====
  openPayDialog(row: InvoiceScheduleRow) {
    this.payRow.set(row);
    this.payAmount.set(row.outstandingAmount);
    this.payMethod.set('BANK_TRANSFER');
    this.payReference.set('');
    this.payRemarks.set('');
    this.payDate.set(new Date().toISOString().slice(0, 10));
    this.payDialog.set(true);
  }

  closePayDialog() {
    this.payDialog.set(false);
    this.payRow.set(null);
  }

  payValid(): boolean {
    const row = this.payRow();
    const amt = Number(this.payAmount());
    return !!row && amt > 0 && amt <= row.outstandingAmount + 0.009;
  }

  async confirmPay() {
    const inv = this.invoice();
    const row = this.payRow();
    if (!inv || !row || !this.payValid()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.invoiceService.collectPayment(inv._id, {
        scheduleId: row._id,
        amount: Number(this.payAmount()),
        paymentMethod: this.payMethod(),
        referenceNo: this.payReference().trim() || undefined,
        remarks: this.payRemarks().trim() || undefined,
        paymentDate: this.payDate() || undefined,
      });
      this.closePayDialog();
      await this.load(inv._id);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Unable to record the payment.');
    } finally {
      this.busy.set(false);
    }
  }

  async downloadReceipt(r: PaymentReceipt) {
    const inv = this.invoice();
    if (!inv) return;
    this.busy.set(true);
    try {
      await this.invoiceService.downloadReceiptPdf(inv._id, r._id, r.receiptNo);
    } catch (err: any) {
      this.error.set(err?.message || 'Receipt PDF download failed.');
    } finally {
      this.busy.set(false);
    }
  }

  // ===== Invoice items editor (pre-approval only) =====
  editingItems = signal(false);
  itemRows = signal<any[]>([]);

  canEditItems(): boolean {
    return this.invoice()?.status === 'DRAFT' || this.invoice()?.status === 'PENDING_APPROVAL';
  }

  startEditItems() {
    const inv = this.invoice();
    if (!inv) return;
    this.itemRows.set((inv.items || []).map((i) => ({ ...i })));
    this.editingItems.set(true);
  }

  cancelEditItems() {
    this.editingItems.set(false);
    this.itemRows.set([]);
  }

  addItemRow() {
    this.itemRows.update((rows) => [...rows, { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  }

  removeItemRow(index: number) {
    this.itemRows.update((rows) => rows.filter((_, i) => i !== index));
  }

  updateItemRow(index: number, field: string, value: any) {
    this.itemRows.update((rows) => {
      if (!rows[index]) return rows;
      const next = [...rows];
      const row = { ...next[index], [field]: field === 'quantity' || field === 'unitPrice' ? (Number(value) || 0) : value };
      row.totalPrice = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
      next[index] = row;
      return next;
    });
  }

  itemTotals() {
    const rows = this.itemRows();
    const subtotal = rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0);
    const rate = Number(this.invoice()?.taxRate ?? 5) || 0;
    const tax = subtotal * (rate / 100);
    return { subtotal, tax, total: subtotal + tax };
  }

  itemsValid(): boolean {
    const rows = this.itemRows();
    return rows.length > 0 && rows.every((r) => String(r.description || '').trim() && (Number(r.quantity) || 0) > 0);
  }

  async saveItems() {
    const inv = this.invoice();
    if (!inv || !this.itemsValid()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.invoiceService.update(inv._id, { items: this.itemRows() });
      await this.load(inv._id);
      this.editingItems.set(false);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Unable to update the invoice items.');
    } finally {
      this.busy.set(false);
    }
  }

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
      await Promise.all([this.loadPaymentSchedule(), this.loadPaymentTypes()]);
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
      // Invoice statuses
      case 'DRAFT': return 'erp-badge erp-badge--draft';
      case 'APPROVED': return 'erp-badge erp-badge--approved';
      case 'CANCELLED': return 'erp-badge erp-badge--cancelled';
      // ERP chain document statuses (inquiry / inspection / quotation / work order)
      case 'CREATED': return 'erp-badge erp-badge--draft';
      case 'SUBMITTED':
      case 'PENDING_APPROVAL':
      case 'SCHEDULED': return 'erp-badge erp-badge--pending';
      case 'REJECTED': return 'erp-badge erp-badge--rejected';
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
