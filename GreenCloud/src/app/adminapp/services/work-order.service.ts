import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../core/services/http-client.service';

export interface WorkOrder { _id: string; workOrderNo: string; quotationId: any; inquiryId: any; leadId: any; inspectionId: any; customerId: any; invoiceId: string | null; serviceType: string; serviceLocation: string; assignedTeam: string; assignedTechnician: string; scheduledDate: string | null; scheduledTime: string; workDescription: string; requiredMaterials: string; remarks: string; startedAt: string | null; completedAt: string | null; completionNotes: string; materialsUsed: string; customerConfirmation: string; workStartEvidence?: { fileName: string; data: string; uploadedAt?: string }[]; workCompletionEvidence?: { fileName: string; data: string; uploadedAt?: string }[]; status: string; workflowHistory?: any[]; quotation?: any; }

@Injectable({ providedIn: 'root' })
export class WorkOrderService {
  private http = inject(HttpClientService);
  list(params: Record<string, string | number> = {}) { return firstValueFrom(this.http.get<{ success: boolean; data: WorkOrder[]; pagination: any }>('/work-orders', params)); }
  getById(id: string) { return firstValueFrom(this.http.get<{ success: boolean; data: WorkOrder }>(`/work-orders/${id}`)); }
  create(data: Partial<WorkOrder>) { return firstValueFrom(this.http.post<{ success: boolean; data: WorkOrder }>('/work-orders', data, { toastAction: 'workOrder.create' })); }
  update(id: string, data: Partial<WorkOrder>) { return firstValueFrom(this.http.put<{ success: boolean; data: WorkOrder }>(`/work-orders/${id}`, data, { toastAction: 'workOrder.update' })); }
  /** Assign team/technician/schedule — also transitions DRAFT → SCHEDULED */
  assign(id: string, data: Partial<WorkOrder>) { return firstValueFrom(this.http.post<{ success: boolean; data: WorkOrder }>(`/work-orders/${id}/assign`, data, { toastAction: 'workOrder.assign' })); }
  submit(id: string) { return firstValueFrom(this.http.post<{ success: boolean; data: WorkOrder }>(`/work-orders/${id}/submit`, {}, { toastAction: 'workOrder.submit' })); }
  approve(id: string) { return firstValueFrom(this.http.post(`/work-orders/${id}/approve`, {}, { toastAction: 'workOrder.approve' })); }
  reject(id: string, reason: string) { return firstValueFrom(this.http.post(`/work-orders/${id}/reject`, { reason }, { toastAction: 'workOrder.reject' })); }
  start(id: string) { return firstValueFrom(this.http.post<{ success: boolean; data: WorkOrder }>(`/work-orders/${id}/start`, {}, { toastAction: 'workOrder.start' })); }
  /** Start work with optional base64 evidence images (data URLs). */
  startWithEvidence(id: string, workStartEvidence: { fileName: string; data: string }[]) { return firstValueFrom(this.http.post<{ success: boolean; data: WorkOrder }>(`/work-orders/${id}/start`, { workStartEvidence }, { toastAction: 'workOrder.start' })); }
  complete(id: string, data: Partial<WorkOrder> & { workCompletionEvidence?: { fileName: string; data: string }[] }) { return firstValueFrom(this.http.post<{ success: boolean; data: WorkOrder; invoice: any }>(`/work-orders/${id}/complete`, data, { toastAction: 'workOrder.complete' })); }
}
