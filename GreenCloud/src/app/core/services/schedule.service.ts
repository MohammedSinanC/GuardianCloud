import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface ScheduleData {
  preferredDate: string;
  preferredTime: string;
}

export interface ScheduleResponse {
  success: boolean;
  message: string;
  data: ScheduleData;
}

export interface ScheduleHistoryEntry {
  _id: string;
  inquiryId: string;
  inquiryNo: string;
  action: string;
  oldPreferredDate: string | null;
  oldPreferredTime: string;
  newPreferredDate: string | null;
  newPreferredTime: string;
  changedBy: string;
  changedByName: string;
  createdAt: string;
}

/**
 * ScheduleService — handles all schedule-related API calls.
 * Uses HttpClientService (auth interceptor handles JWT automatically).
 */
@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private httpClient = inject(HttpClientService);

  /**
   * Get schedule for a service request
   */
  getSchedule(serviceRequestId: string): Observable<ScheduleResponse> {
    return this.httpClient.get<ScheduleResponse>(
      `/admin/service-requests/${serviceRequestId}/schedule`
    );
  }

  /**
   * Create schedule for a service request
   */
  createSchedule(serviceRequestId: string, data: ScheduleData): Observable<ScheduleResponse> {
    return this.httpClient.post<ScheduleResponse>(
      `/admin/service-requests/${serviceRequestId}/schedule`,
      data
    );
  }

  /**
   * Update schedule for a service request
   */
  updateSchedule(serviceRequestId: string, data: ScheduleData): Observable<ScheduleResponse> {
    return this.httpClient.put<ScheduleResponse>(
      `/admin/service-requests/${serviceRequestId}/schedule`,
      data
    );
  }

  /**
   * Delete schedule for a service request
   */
  deleteSchedule(serviceRequestId: string): Observable<{ success: boolean; message: string }> {
    return this.httpClient.delete<{ success: boolean; message: string }>(
      `/admin/service-requests/${serviceRequestId}/schedule`
    );
  }
}
