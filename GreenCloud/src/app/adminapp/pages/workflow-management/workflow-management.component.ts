import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../../../core/services/workflow.service';

@Component({
  selector: 'app-workflow-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workflow-management.component.html',
  styleUrl: './workflow-management.component.css',
})
export class WorkflowManagementComponent implements OnInit {
  private workflowService = inject(WorkflowService);

  workflowConfig = signal<any>(null);
  loading = signal(false);
  error = signal('');
  selectedWorkflow = 'PEST_CONTROL';

  workflows = [
    { code: 'PEST_CONTROL', name: 'Pest Control Workflow' },
  ];

  ngOnInit() {
    this.loadWorkflowConfig();
  }

  async loadWorkflowConfig() {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.workflowService.getWorkflowConfig(this.selectedWorkflow);
      if (response.success) {
        this.workflowConfig.set(response.data);
      }
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed to load workflow configuration');
    } finally {
      this.loading.set(false);
    }
  }

  onWorkflowChange(code: string) {
    this.selectedWorkflow = code;
    this.loadWorkflowConfig();
  }

  getActionCount(actions: any[]): number {
    return actions?.length || 0;
  }
}
