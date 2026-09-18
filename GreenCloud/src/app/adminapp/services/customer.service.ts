import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../core/services/http-client.service';

export interface ErpCustomer {
  _id: string;
  customerCode: string;
  companyName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  address: string;
  location: string;
  customerType: string;
  trnNumber: string;
  paymentTerms: string;
  status: string;
  ledgerId: string | null;
  createdAt: string;
}

export interface CustomerDetail {
  customer: ErpCustomer;
  ledger: { _id: string; openingBalance: number; currentBalance: number } | null;
  summary: { openingBalance: number; totalDebit: number; totalCredit: number; outstandingBalance: number };
  leads: { _id: string; leadNo: string; status: string; createdAt: string }[];
  inquiries: { _id: string; inquiryNo: string; status: string; currentStageCode: string; createdAt: string }[];
}

export interface CustomerListResponse {
  success: boolean;
  data: ErpCustomer[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private http = inject(HttpClientService);

  async list(params?: { page?: number; limit?: number; search?: string }): Promise<CustomerListResponse> {
    const q: Record<string, string | number> = {};
    if (params?.page) q['page'] = params.page;
    if (params?.limit) q['limit'] = params.limit;
    if (params?.search) q['search'] = params.search;
    return firstValueFrom(this.http.get<CustomerListResponse>('/customers', q));
  }

  async listAll(search?: string): Promise<ErpCustomer[]> {
    const response = await this.list({ page: 1, limit: 200, search });
    return response.data;
  }

  async getById(id: string): Promise<{ success: boolean; data: CustomerDetail }> {
    return firstValueFrom(this.http.get<{ success: boolean; data: CustomerDetail }>(`/customers/${id}`));
  }

  async create(data: Partial<ErpCustomer>): Promise<{ success: boolean; data: ErpCustomer; message: string }> {
    return firstValueFrom(this.http.post('/customers', data, { toastAction: 'customer.create' }));
  }

  async update(id: string, data: Partial<ErpCustomer>): Promise<{ success: boolean; data: ErpCustomer; message: string }> {
    return firstValueFrom(this.http.put(`/customers/${id}`, data, { toastAction: 'customer.update' }));
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(this.http.delete<{ success: boolean; message: string }>(`/customers/${id}`, { toastAction: 'customer.delete' }));
  }
}
