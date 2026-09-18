import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface WorkflowAction {
  id: string;
  code: string;
  name: string;
  nextStageCode: string | null;
  rejectStageCode: string | null;
  buttonColor: string;
  requiresComment: boolean;
  requiresAttachment: boolean;
  mailRequired: boolean;
  mailRecipients: string;
}

export interface WorkflowActionsResponse {
  success: boolean;
  data: {
    entityId: string;
    currentStage: {
      code: string;
      name: string;
      type: string;
    };
    actions: WorkflowAction[];
  };
}

export interface WorkflowHistoryEntry {
  _id: string;
  workflowCode: string;
  entityType: string;
  entityId: string;
  fromStageCode: string;
  toStageCode: string;
  actionCode: string;
  actionName: string;
  performedByName: string;
  performedByRole: string;
  comment: string;
  createdAt: string;
}

export interface WorkflowExecuteResponse {
  success: boolean;
  message: string;
  data: {
    entityId: string;
    previousStage: string;
    currentStage: string;
    actionCode: string;
  };
}

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private httpClient = inject(HttpClientService);

  /**
   * Get available actions for an entity
   */
  async getAvailableActions(entityType: string, entityId: string): Promise<WorkflowActionsResponse> {
    return firstValueFrom(
      this.httpClient.get<WorkflowActionsResponse>(`/workflow/${entityType}/${entityId}/actions`)
    );
  }

  /**
   * Execute a workflow action
   */
  async executeAction(
    entityType: string,
    entityId: string,
    actionCode: string,
    comment?: string,
    options?: { toastAction?: string }
  ): Promise<WorkflowExecuteResponse> {
    return firstValueFrom(
      this.httpClient.post<WorkflowExecuteResponse>('/workflow/execute', {
        entityType,
        entityId,
        actionCode,
        comment: comment || '',
      }, options)
    );
  }

  /**
   * Get workflow history for an entity
   */
  async getHistory(entityType: string, entityId: string): Promise<{ success: boolean; data: WorkflowHistoryEntry[] }> {
    return firstValueFrom(
      this.httpClient.get<{ success: boolean; data: WorkflowHistoryEntry[] }>(
        `/workflow/${entityType}/${entityId}/history`
      )
    );
  }

  /**
   * Get workflow configuration (admin)
   */
  async getWorkflowConfig(workflowCode: string): Promise<any> {
    return firstValueFrom(
      this.httpClient.get<any>(`/workflow/config/${workflowCode}`)
    );
  }
}
