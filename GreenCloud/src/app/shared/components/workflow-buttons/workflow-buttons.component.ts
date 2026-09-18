import { Component, input, output, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService, WorkflowAction } from '../../../core/services/workflow.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-workflow-buttons',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workflow-buttons.component.html',
  styleUrl: './workflow-buttons.component.css',
})
export class WorkflowButtonsComponent implements OnInit {
  entityType = input.required<string>();
  entityId = input.required<string>();
  completed = output<void>();

  private workflowService = inject(WorkflowService);

  actions = signal<WorkflowAction[]>([]);
  currentStage = signal<{ code: string; name: string; type: string } | null>(null);
  loading = signal(false);
  executing = signal(false);

  // Confirmation dialog
  showConfirm = signal(false);
  selectedAction = signal<WorkflowAction | null>(null);
  comment = '';

  ngOnInit() {
    this.loadActions();
  }

  async loadActions() {
    this.loading.set(true);
    try {
      const response = await this.workflowService.getAvailableActions(
        this.entityType(),
        this.entityId()
      );
      if (response.success) {
        this.actions.set(response.data.actions);
        this.currentStage.set(response.data.currentStage);
      }
    } catch (error) {
      console.error('Failed to load workflow actions:', error);
    } finally {
      this.loading.set(false);
    }
  }

  onActionClick(action: WorkflowAction) {
    this.selectedAction.set(action);
    this.comment = '';
    this.showConfirm.set(true);
  }

  async confirmAction() {
    const action = this.selectedAction();
    if (!action) return;

    this.executing.set(true);
    try {
      await this.workflowService.executeAction(
        this.entityType(),
        this.entityId(),
        action.code,
        this.comment
      );
      this.showConfirm.set(false);
      this.selectedAction.set(null);
      this.comment = '';
      await this.loadActions();
      this.completed.emit();
    } catch (error: any) {
      alert(error?.error?.message || 'Failed to execute action');
    } finally {
      this.executing.set(false);
    }
  }

  cancelConfirm() {
    this.showConfirm.set(false);
    this.selectedAction.set(null);
    this.comment = '';
  }

  getButtonClass(color: string): string {
    const classes: Record<string, string> = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      success: 'btn-success',
      danger: 'btn-danger',
      warning: 'btn-warning',
      info: 'btn-info',
    };
    return classes[color] || 'btn-primary';
  }
}
