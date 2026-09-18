import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface Inquiry {
  _id: string;
  inquiryNo: string;
  workflowCode: string;
  currentStageCode: string;
  status: string;
  customerName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  serviceLocation: string;
  building: string;
  unit: string;
  area: string;
  pestTypes: string[];
  problemDescription: string;
  preferredDate: string | null;
  preferredTime: string;
  urgency: string;
  attachments: any[];
  remarks: string;
  inspectionId: string | null;
  quotationId: string | null;
  serviceJobId: string | null;
  invoiceId: string | null;
  createdBy: string;
  createdByName: string;
  assignedToName: string;
  createdAt: string;
  updatedAt: string;
  siteInspectionRequired?: boolean;
  leadId?: string | null;
  customerId?: string | null;
  erpCustomerId?: string | null;
  companyName?: string;
  source?: string;
  serviceType?: string;
  location?: string;
  rejectionReason?: string;
  approvedDate?: string | null;
  rejectedDate?: string | null;
  linkedDocuments?: any;
  workflowHistory?: any[];
  scheduleLastUpdatedAt?: string;
  scheduleLastUpdatedBy?: string;
}

export interface InquiryListResponse {
  success: boolean;
  data: Inquiry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface InquiryCreatePayload {
  customerName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  serviceLocation: string;
  building: string;
  unit: string;
  area: string;
  pestTypes: string[];
  problemDescription: string;
  preferredDate?: string;
  preferredTime?: string;
  urgency?: string;
  remarks?: string;
  workflowCode?: string;
}

@Injectable({ providedIn: 'root' })
export class InquiryService {
  private httpClient = inject(HttpClientService);

  /**
   * Create a new inquiry
   */
  async createInquiry(payload: InquiryCreatePayload): Promise<{ success: boolean; data: Inquiry }> {
    return firstValueFrom(
      this.httpClient.post<{ success: boolean; data: Inquiry }>('/inquiries', payload)
    );
  }

  /**
   * List inquiries with filters
   */
  async listInquiries(params: {
    page?: number;
    limit?: number;
    search?: string;
    stage?: string;
    status?: string;
    urgency?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Promise<InquiryListResponse> {
    const queryParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams[key] = value.toString();
      }
    });

    return firstValueFrom(
      this.httpClient.get<InquiryListResponse>('/inquiries', queryParams)
    );
  }

  /**
   * Get inquiry by ID
   */
  async getInquiryById(id: string): Promise<{ success: boolean; data: Inquiry }> {
    return firstValueFrom(
      this.httpClient.get<{ success: boolean; data: Inquiry }>(`/inquiries/${id}`)
    );
  }

  /**
   * Update an inquiry
   */
  async updateInquiry(id: string, payload: Partial<InquiryCreatePayload>): Promise<{ success: boolean; data: Inquiry }> {
    return firstValueFrom(
      this.httpClient.put<{ success: boolean; data: Inquiry }>(`/inquiries/${id}`, payload)
    );
  }

  async saveDraft(id: string, payload: Partial<Inquiry>, options?: { toastAction?: string }): Promise<{ success: boolean; data: Inquiry; message: string }> {
    return firstValueFrom(
      this.httpClient.post<{ success: boolean; data: Inquiry; message: string }>(
        `/inquiries/${id}/draft`,
        payload,
        options
      )
    );
  }

  async approve(id: string, siteInspectionRequired: boolean, options?: { toastAction?: string }): Promise<{ success: boolean; data: Inquiry; message: string; nextType: 'INSPECTION' | 'QUOTATION'; nextId: string }> {
    return firstValueFrom(
      this.httpClient.post<{ success: boolean; data: Inquiry; message: string; nextType: 'INSPECTION' | 'QUOTATION'; nextId: string }>(
        `/inquiries/${id}/approve`,
        { siteInspectionRequired },
        options
      )
    );
  }

  async reject(id: string, reason: string, options?: { toastAction?: string }): Promise<{ success: boolean; data: Inquiry; message: string }> {
    return firstValueFrom(
      this.httpClient.post<{ success: boolean; data: Inquiry; message: string }>(
        `/inquiries/${id}/reject`,
        { reason },
        options
      )
    );
  }

  /**
   * Get inquiry statistics
   */
  async getStats(): Promise<{ success: boolean; data: any }> {
    return firstValueFrom(
      this.httpClient.get<{ success: boolean; data: any }>('/inquiries/stats')
    );
  }

  /**
   * Update schedule (preferred date & time) — admin only
   */
  async updateSchedule(id: string, preferredDate: string, preferredTime: string, urgency?: string, options?: { toastAction?: string }): Promise<{ success: boolean; data: any; message: string }> {
    const body: any = { preferredDate, preferredTime };
    if (urgency) body.urgency = urgency;
    return firstValueFrom(
      this.httpClient.put<{ success: boolean; data: any; message: string }>(
        `/admin/service-requests/${id}/schedule`,
        body,
        options
      )
    );
  }
}
