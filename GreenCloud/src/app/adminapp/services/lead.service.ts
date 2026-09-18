import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../core/services/http-client.service';

export interface Lead {
  _id: string;
  leadNo: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  companyName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  address: string;
  location: string;
  source: string;
  serviceRequired: string;
  preferredDate: string | null;
  preferredTime: string;
  description: string;
  notes: string;
  customerId: string | null;
  inquiryId: string | null;
  rejectionReason: string;
  approvedByName: string;
  approvedDate: string | null;
  rejectedByName: string;
  rejectedDate: string | null;
  createdByName: string;
  createdAt: string;
}

export interface LeadListResponse {
  success: boolean;
  data: Lead[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class LeadService {
  private http = inject(HttpClientService);

  async list(params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<LeadListResponse> {
    const q: Record<string, string | number> = {};
    if (params?.page) q['page'] = params.page;
    if (params?.limit) q['limit'] = params.limit;
    if (params?.search) q['search'] = params.search;
    if (params?.status) q['status'] = params.status;
    return firstValueFrom(this.http.get<LeadListResponse>('/leads', q));
  }

  async getById(id: string): Promise<{ success: boolean; data: Lead }> {
    return firstValueFrom(this.http.get<{ success: boolean; data: Lead }>(`/leads/${id}`));
  }

  async create(data: Partial<Lead>, options?: { toastAction?: string }): Promise<{ success: boolean; data: Lead; message: string }> {
    return firstValueFrom(this.http.post('/leads', data, options));
  }

  async update(id: string, data: Partial<Lead> & { resubmit?: boolean }, options?: { toastAction?: string }): Promise<{ success: boolean; data: Lead; message: string }> {
    return firstValueFrom(this.http.put(`/leads/${id}`, data, options));
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(this.http.delete(`/leads/${id}`, { toastAction: 'lead.delete' }));
  }

  async submit(id: string, options?: { toastAction?: string }): Promise<{ success: boolean; data: Lead; message: string }> {
    return firstValueFrom(this.http.post(`/leads/${id}/submit`, {}, options));
  }

  async approve(id: string, existingCustomerId?: string, options?: { toastAction?: string }): Promise<{ success: boolean; message: string; alreadyApproved?: boolean; data?: any }> {
    const body = existingCustomerId ? { customerId: existingCustomerId } : {};
    return firstValueFrom(this.http.post(`/leads/${id}/approve`, body, options));
  }

  async reject(id: string, reason: string, options?: { toastAction?: string }): Promise<{ success: boolean; data: Lead; message: string }> {
    return firstValueFrom(this.http.post(`/leads/${id}/reject`, { reason }, options));
  }
}
