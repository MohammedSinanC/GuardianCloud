import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../core/services/http-client.service';

export interface DashboardSummary {
  totalCustomers: number;
  pendingInquiries: number;
  totalInquiries: number;
  totalCompleted: number;
}

export interface MonthCount {
  month: string;
  count: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface LocationCount {
  location: string;
  count: number;
}

export interface QuotationConversion {
  inquiries: number;
  quotationsSent: number;
  accepted: number;
  completed: number;
}

export interface LatestInquiry {
  _id: string;
  inquiryNo: string;
  customerName: string;
  serviceLocation: string;
  currentStageCode: string;
  status: string;
  createdAt: string;
  pestTypes: string[];
}

export interface DashboardData {
  summary: DashboardSummary;
  monthlyQuotations: MonthCount[];
  requestsByStatus: StatusCount[];
  requestsByLocation: LocationCount[];
  monthlyRequests: MonthCount[];
  quotationConversion: QuotationConversion;
  performance: StatusCount[];
  latestInquiries: LatestInquiry[];
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}

export interface DashboardFilters {
  year?: number;
  dateRange?: string;
  location?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private httpClient = inject(HttpClientService);

  async getDashboard(filters: DashboardFilters = {}): Promise<DashboardResponse> {
    const params: Record<string, string> = {};
    if (filters.year) params['year'] = filters.year.toString();
    if (filters.dateRange) params['dateRange'] = filters.dateRange;
    if (filters.location) params['location'] = filters.location;

    return firstValueFrom(
      this.httpClient.get<DashboardResponse>('/admin/dashboard', params)
    );
  }
}
