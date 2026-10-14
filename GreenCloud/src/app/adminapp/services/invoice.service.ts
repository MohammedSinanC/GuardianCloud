import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../core/services/http-client.service';
import { environment } from '../../../environments/environment';

export interface Invoice {
  _id: string;
  invoiceNo: string;
  inquiryId: string;
  workOrderId: { _id: string; workOrderNo: string } | string | null;
  quotationId: { _id: string; quotationNo: string; totalAmount: number; status: string } | string | null;
  customerId: { _id: string; companyName: string; customerCode: string } | string | null;
  items: { description: string; quantity: number; unitPrice: number; totalPrice: number }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'POSTED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paymentTypeId?: string | null;
  paymentTypeName?: string;
  paymentTermsPlan?: {
    frequency: string;
    numberOfPayments: number;
    intervalMonths: number;
    gracePeriodDays: number;
    installmentPlan: number[];
  } | null;
  paymentStatus: string;
  dueDate: string | null;
  paymentTerms: string;
  bankDetails: string;
  notes: string;
  createdAt: string;
  // enriched by getById — full ERP chain documents
  inquiryNo?: string;
  leadNo?: string;
  inquiry?: any | null;
  siteInspection?: any | null;
  quotation?: any | null;
  workOrder?: any | null;
}

export interface PaymentReceipt {
  _id: string;
  receiptNo: string;
  receiptDate: string;
  paymentMethod: string;
  amount: number;
  referenceNo: string;
  remarks: string;
  status: string;
  paymentScheduleId?: string | null;
  createdByName?: string;
}

export interface InvoiceScheduleRow {
  _id: string;
  paymentNo: number;
  percentage: number;
  paymentDate: string;
  dueDate: string;
  graceDays: number;
  finalDueDate: string | null;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  derivedStatus: 'UPCOMING' | 'GRACE_PERIOD' | 'OVERDUE' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED';
  paymentTypeName?: string;
}

export interface InvoiceScheduleSummary {
  totalScheduled: number;
  totalReceived: number;
  totalOutstanding: number;
  overdueAmount: number;
  next: InvoiceScheduleRow | null;
}

export interface InvoiceScheduleResponse {
  success: boolean;
  data: {
    schedule: InvoiceScheduleRow[];
    summary: InvoiceScheduleSummary;
    receipts: PaymentReceipt[];
  };
}

export interface InvoiceListResponse {
  success: boolean;
  data: Invoice[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private http = inject(HttpClientService);

  async list(params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<InvoiceListResponse> {
    const q: Record<string, string | number> = {};
    if (params?.page) q['page'] = params.page;
    if (params?.limit) q['limit'] = params.limit;
    if (params?.search) q['search'] = params.search;
    if (params?.status) q['status'] = params.status;
    return firstValueFrom(this.http.get<InvoiceListResponse>('/invoices', q));
  }

  async getById(id: string): Promise<{ success: boolean; data: Invoice }> {
    return firstValueFrom(this.http.get<{ success: boolean; data: Invoice }>(`/invoices/${id}`));
  }

  async createFromQuotation(quotationId: string): Promise<{ success: boolean; data: Invoice; message: string }> {
    return firstValueFrom(this.http.post('/invoices', { quotationId }, { toastAction: 'invoice.create' }));
  }

  async approve(id: string): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(this.http.post(`/invoices/${id}/approve`, {}, { toastAction: 'invoice.approve' }));
  }

  /** Edit items/details on a draft invoice — blocked by the backend after approval. */
  async update(id: string, payload: { items?: Invoice['items']; dueDate?: string | null; notes?: string; bankDetails?: string; paymentTerms?: string }): Promise<{ success: boolean; data: Invoice; message: string }> {
    return firstValueFrom(this.http.put<{ success: boolean; data: Invoice; message: string }>(`/invoices/${id}`, payload, { toastAction: 'invoice.update' }));
  }

  /** Select payment type — backend loads terms + generates the schedule in one call. */
  async selectPaymentType(id: string, paymentTypeId: string): Promise<{ success: boolean; data: Invoice; message: string }> {
    return firstValueFrom(this.http.put<{ success: boolean; data: Invoice; message: string }>(`/invoices/${id}/payment-type`, { paymentTypeId }, { toastAction: 'invoice.paymentType' }));
  }

  /** Invoice payment schedule with derived statuses, summary and receipts. */
  async getPaymentSchedule(id: string): Promise<InvoiceScheduleResponse> {
    return firstValueFrom(this.http.get<InvoiceScheduleResponse>(`/invoices/${id}/payment-schedule`));
  }

  /** Record a payment against an installment — receipt + schedule + invoice + ledger in one transaction. */
  async collectPayment(id: string, payload: { scheduleId: string; amount: number; paymentMethod: string; referenceNo?: string; remarks?: string; paymentDate?: string }): Promise<{ success: boolean; message: string; data: { receipt: PaymentReceipt; ledgerTransactionId?: string } }> {
    return firstValueFrom(this.http.post<{ success: boolean; message: string; data: { receipt: PaymentReceipt; ledgerTransactionId?: string } }>(`/invoices/${id}/collect`, payload, { toastAction: 'invoice.collect' }));
  }

  /** Download a payment receipt PDF via auth header. */
  async downloadReceiptPdf(invoiceId: string, receiptId: string, receiptNo: string): Promise<void> {
    const base = environment.apiUrl.replace('/api/v1', '');
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${base}/api/invoices/${invoiceId}/receipts/${receiptId}/pdf`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) throw new Error('Receipt PDF download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${receiptNo}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async cancel(id: string): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(this.http.post(`/invoices/${id}/cancel`, {}, { toastAction: 'invoice.cancel' }));
  }

  async sendToCustomer(id: string): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(this.http.post(`/invoices/${id}/send`, {}, { toastAction: 'invoice.send' }));
  }

  /**
   * Download the invoice PDF via the auth header.
   * Returns a Blob the component can trigger a browser download from.
   */
  async downloadPdf(id: string): Promise<Blob> {
    const base = environment.apiUrl.replace('/api/v1', '');
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${base}/api/invoices/${id}/pdf`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) throw new Error('PDF download failed');
    return res.blob();
  }
}
