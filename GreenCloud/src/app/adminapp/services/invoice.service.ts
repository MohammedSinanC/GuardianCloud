import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../core/services/http-client.service';
import { environment } from '../../../environments/environment';

export interface Invoice {
  _id: string;
  invoiceNo: string;
  inquiryId: string;
  quotationId: { _id: string; quotationNo: string; totalAmount: number; status: string } | string | null;
  customerId: { _id: string; companyName: string; customerCode: string } | string | null;
  items: { description: string; quantity: number; unitPrice: number; totalPrice: number }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: 'DRAFT' | 'APPROVED' | 'CANCELLED';
  paymentStatus: string;
  dueDate: string | null;
  paymentTerms: string;
  bankDetails: string;
  notes: string;
  createdAt: string;
  // enriched by getById
  inquiryNo?: string;
  leadNo?: string;
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
