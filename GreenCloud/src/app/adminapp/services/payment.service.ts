import { Injectable, inject } from '@angular/core';
import { HttpClientService, HttpRequestOptions } from '../../core/services/http-client.service';
import { Observable } from 'rxjs';

export interface PaymentType {
  _id: string;
  name: string;
  code: string;
  frequency: string;
  interval: number;
  gracePeriodDays: number;
  isActive: boolean;
}

export interface QuotationItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Quotation {
  _id: string;
  quotationNo: string;
  inquiryId: string;
  items: QuotationItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  paymentTypeId: string;
  paymentTypeName: string;
  paymentStartDate: string;
  paymentEndDate: string;
  durationMonths: number;
  gracePeriodDays: number;
  numberOfPayments: number;
  paymentFrequency: string;
  customIntervalMonths: number;
  customPaymentCount: number;
  terms: string;
  notes: string;
}

export interface PaymentScheduleRecord {
  _id: string;
  quotationId: string;
  inquiryId: string;
  paymentNo: number;
  paymentDate: string;
  dueDate: string;
  paymentTypeName: string;
  paymentFrequency: string;
  intervalMonths: number;
  amount: number;
  vat: number;
  total: number;
  status: string;
  paidAmount: number;
  remainingAmount: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClientService);

  // Payment Types
  getPaymentTypes(): Observable<{ success: boolean; data: PaymentType[] }> {
    return this.http.get('/payment-types');
  }

  createPaymentType(data: Partial<PaymentType>): Observable<any> {
    return this.http.post('/payment-types', data);
  }

  updatePaymentType(id: string, data: Partial<PaymentType>): Observable<any> {
    return this.http.put(`/payment-types/${id}`, data);
  }

  deletePaymentType(id: string): Observable<any> {
    return this.http.delete(`/payment-types/${id}`);
  }

  // Quotation
  getQuotation(inquiryId: string): Observable<{ success: boolean; data: Quotation }> {
    return this.http.get(`/inquiries/${inquiryId}/quotation`);
  }

  createQuotation(inquiryId: string, data: any, options?: HttpRequestOptions): Observable<{ success: boolean; data: Quotation }> {
    return this.http.post(`/inquiries/${inquiryId}/quotation`, data, options);
  }

  updateQuotation(inquiryId: string, data: any, options?: HttpRequestOptions): Observable<{ success: boolean; data: Quotation }> {
    return this.http.put(`/inquiries/${inquiryId}/quotation`, data, options);
  }

  // Payment Schedule
  generateSchedule(quotationId: string, options?: HttpRequestOptions): Observable<{ success: boolean; data: { schedule: PaymentScheduleRecord[]; quotation: Quotation } }> {
    return this.http.post(`/quotations/${quotationId}/payment-schedule/generate`, {}, options);
  }

  getSchedule(quotationId: string): Observable<{ success: boolean; data: { schedule: PaymentScheduleRecord[]; quotation: Quotation } }> {
    return this.http.get(`/quotations/${quotationId}/payment-schedule`);
  }

  updateScheduleRecord(id: string, data: Partial<PaymentScheduleRecord>, options?: HttpRequestOptions): Observable<any> {
    return this.http.put(`/payment-schedule/${id}`, data, options);
  }
}
