import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../core/services/http-client.service';

export interface SiteInspection {
  _id: string;
  inspectionNo: string;
  // Populated by the backend with inquiry/customer details (string when not populated)
  inquiryId: any;
  leadId: string | null;
  customerId: any;
  quotationId: string | null;
  inspectionDate: string | null;
  location: string;
  inspector: string;
  inspectionType: string;
  findings: string;
  pestType: string;
  affectedArea: string;
  severity: string;
  recommendations: string;
  requiredTreatment: string;
  estimatedWork: string;
  remarks: string;
  status: string;
  // Base64 site images persisted in MongoDB (existing schema array)
  attachments: { fileName: string; fileUrl: string; fileType: string; uploadedAt?: string }[];
  // Flattened by the backend list endpoint for ERP display
  inquiryNo?: string;
  customerName?: string;
  siteLocation?: string;
  rejectionReason?: string;
  workflowHistory?: any[];
}

@Injectable({ providedIn: 'root' })
export class SiteInspectionService {
  private http = inject(HttpClientService);
  list(params: Record<string, string | number> = {}) { return firstValueFrom(this.http.get<{ success: boolean; data: SiteInspection[]; pagination: any }>('/site-inspections', params)); }
  getById(id: string) { return firstValueFrom(this.http.get<{ success: boolean; data: SiteInspection }>(`/site-inspections/${id}`)); }
  create(data: Partial<SiteInspection>) { return firstValueFrom(this.http.post<{ success: boolean; data: SiteInspection }>('/site-inspections', data, { toastAction: 'inspection.create' })); }
  update(id: string, data: Partial<SiteInspection>) { return firstValueFrom(this.http.put<{ success: boolean; data: SiteInspection }>(`/site-inspections/${id}`, data, { toastAction: 'inspection.update' })); }
  submit(id: string) { return firstValueFrom(this.http.post<{ success: boolean; data: SiteInspection }>(`/site-inspections/${id}/submit`, {}, { toastAction: 'inspection.submit' })); }
  approve(id: string) { return firstValueFrom(this.http.post<{ success: boolean; data: SiteInspection; quotation?: any }>(`/site-inspections/${id}/approve`, {}, { toastAction: 'inspection.approve' })); }
  reject(id: string, reason: string) { return firstValueFrom(this.http.post(`/site-inspections/${id}/reject`, { reason }, { toastAction: 'inspection.reject' })); }
}
