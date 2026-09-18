import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';
import { environment } from '../../../environments/environment';

export interface Quotation {
  _id: string;
  inquiryId: string;
  quotationNo: string;
  status: string;
  items: QuotationItem[];
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  validUntil: string;
  notes: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface QuotationListResponse {
  success: boolean;
  data: Quotation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * QuotationService — handles all quotation-related API calls.
 * Uses HttpClientService (auth interceptor handles JWT automatically).
 */
@Injectable({ providedIn: 'root' })
export class QuotationService {
  private httpClient = inject(HttpClientService);

  /**
   * Download the quotation PDF via the auth header.
   * Returns a Blob the component can trigger a browser download from.
   */
  async downloadPdf(id: string): Promise<Blob> {
    const base = environment.apiUrl.replace('/api/v1', '');
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${base}/api/quotations/${id}/pdf`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) throw new Error('PDF download failed');
    return res.blob();
  }

  /**
   * List all quotations
   */
  getAll(params?: { page?: number; limit?: number; status?: string }): Observable<QuotationListResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams['page'] = params.page.toString();
    if (params?.limit) queryParams['limit'] = params.limit.toString();
    if (params?.status) queryParams['status'] = params.status;
    return this.httpClient.get<QuotationListResponse>('/quotations', queryParams);
  }

  /**
   * Get quotation by ID
   */
  getById(id: string): Observable<{ success: boolean; data: Quotation }> {
    return this.httpClient.get<{ success: boolean; data: Quotation }>(`/quotations/${id}`);
  }

  /**
   * Create a new quotation
   */
  create(data: Partial<Quotation>): Observable<{ success: boolean; data: Quotation }> {
    return this.httpClient.post<{ success: boolean; data: Quotation }>('/quotations', data);
  }

  /**
   * Update a quotation
   */
  update(id: string, data: Partial<Quotation>): Observable<{ success: boolean; data: Quotation }> {
    return this.httpClient.put<{ success: boolean; data: Quotation }>(`/quotations/${id}`, data);
  }

  /**
   * Delete a quotation
   */
  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.httpClient.delete<{ success: boolean; message: string }>(`/quotations/${id}`);
  }

  /**
   * Send quotation to customer
   */
  send(id: string): Observable<{ success: boolean; message: string }> {
    return this.httpClient.post<{ success: boolean; message: string }>(`/quotations/${id}/send`, {});
  }

  /**
   * Approve a quotation
   */
  approve(id: string): Observable<{ success: boolean; message: string }> {
    return this.httpClient.post<{ success: boolean; message: string }>(`/quotations/${id}/approve`, {});
  }

  /**
   * Reject a quotation
   */
  reject(id: string, data: { reason?: string }): Observable<{ success: boolean; message: string }> {
    return this.httpClient.post<{ success: boolean; message: string }>(`/quotations/${id}/reject`, data);
  }
}
