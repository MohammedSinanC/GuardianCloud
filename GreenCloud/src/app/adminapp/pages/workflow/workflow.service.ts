import { Injectable, inject } from '@angular/core';
import { HttpClientService } from '../../../core/services/http-client.service';
import { WorkflowStage, WorkflowAction, WorkflowConfig } from './models/workflow.model';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WorkflowDataService {
  private http = inject(HttpClientService);

  private readonly WORKFLOW_CODE = 'PEST_CONTROL';

  /** Get full workflow config (stages + actions) */
  getConfig(): Observable<WorkflowConfig> {
    return this.http.get<WorkflowConfig>(`/workflow/config/${this.WORKFLOW_CODE}`);
  }

  /** Create a new stage */
  createStage(data: Partial<WorkflowStage>): Observable<WorkflowStage> {
    return this.http.post<WorkflowStage>(`/workflow/config/${this.WORKFLOW_CODE}/stages`, data);
  }

  /** Update a stage */
  updateStage(stageId: string, data: Partial<WorkflowStage>): Observable<WorkflowStage> {
    return this.http.put<WorkflowStage>(`/workflow/config/${this.WORKFLOW_CODE}/stages/${stageId}`, data);
  }

  /** Delete a stage (soft) */
  deleteStage(stageId: string): Observable<any> {
    return this.http.delete(`/workflow/config/${this.WORKFLOW_CODE}/stages/${stageId}`);
  }

  /** Create a new action */
  createAction(data: Partial<WorkflowAction>): Observable<WorkflowAction> {
    return this.http.post<WorkflowAction>(`/workflow/config/${this.WORKFLOW_CODE}/actions`, data);
  }

  /** Update an action */
  updateAction(actionId: string, data: Partial<WorkflowAction>): Observable<WorkflowAction> {
    return this.http.put<WorkflowAction>(`/workflow/config/${this.WORKFLOW_CODE}/actions/${actionId}`, data);
  }

  /** Delete an action (soft) */
  deleteAction(actionId: string): Observable<any> {
    return this.http.delete(`/workflow/config/${this.WORKFLOW_CODE}/actions/${actionId}`);
  }
}
