import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../core/services/http-client.service';

export interface Receipt { _id: string; receiptNo: string; receiptDate: string; customerId: string; ledgerAccountId: string; invoiceId: string | null; paymentScheduleId: string | null; paymentMethod: string; amount: number; referenceNo: string; remarks: string; status: string; }

@Injectable({ providedIn: 'root' })
export class ReceiptService {
  private http = inject(HttpClientService);
  list(params: Record<string, string | number> = {}) { return firstValueFrom(this.http.get<{ success: boolean; data: Receipt[]; pagination: any }>('/receipts', params)); }
  getById(id: string) { return firstValueFrom(this.http.get<{ success: boolean; data: Receipt }>(`/receipts/${id}`)); }
  create(data: Partial<Receipt>) { return firstValueFrom(this.http.post<{ success: boolean; data: Receipt }>('/receipts', data, { toastAction: 'receipt.create' })); }
  update(id: string, data: Partial<Receipt>) { return firstValueFrom(this.http.put<{ success: boolean; data: Receipt }>(`/receipts/${id}`, data, { toastAction: 'receipt.update' })); }
  post(id: string) { return firstValueFrom(this.http.post<{ success: boolean; data: Receipt }>(`/receipts/${id}/post`, {}, { toastAction: 'receipt.post' })); }
}
