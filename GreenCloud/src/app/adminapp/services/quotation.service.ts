import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../core/services/http-client.service';

@Injectable({ providedIn: 'root' })
export class QuotationService {
  private http = inject(HttpClientService);
  list(params: Record<string, string | number> = {}) { return firstValueFrom(this.http.get<any>('/quotations', params)); }
  getById(id: string) { return firstValueFrom(this.http.get<any>(`/quotations/${id}`)); }
  create(data: any) { return firstValueFrom(this.http.post<any>('/quotations', data, { toastAction: 'quotation.create' })); }
  update(id: string, data: any) { return firstValueFrom(this.http.put<any>(`/quotations/${id}`, data, { toastAction: 'quotation.update' })); }
  submit(id: string) { return firstValueFrom(this.http.post<any>(`/quotations/${id}/submit`, {}, { toastAction: 'quotation.submit' })); }
  approve(id: string) { return firstValueFrom(this.http.post<any>(`/quotations/${id}/approve`, {}, { toastAction: 'quotation.approve' })); }
  reject(id: string, reason: string) { return firstValueFrom(this.http.post<any>(`/quotations/${id}/reject`, { reason }, { toastAction: 'quotation.reject' })); }
}
