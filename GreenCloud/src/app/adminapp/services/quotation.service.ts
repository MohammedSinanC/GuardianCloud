import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../core/services/http-client.service';
import { environment } from '../../../environments/environment';

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
  /** Authenticated PDF download — fetches the blob with the auth header and triggers a browser download */
  async downloadPdf(id: string, quotationNo: string) {
    const base = (environment.apiUrl || '').replace('/api/v1', '');
    const token = localStorage.getItem('admin_token') || '';
    const res = await fetch(`${base}/api/quotations/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Unable to generate the quotation PDF.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quotationNo || 'quotation'}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
