import { Component, input, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService, WorkflowHistoryEntry } from '../../../core/services/workflow.service';

@Component({
  selector: 'app-workflow-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workflow-timeline.component.html',
  styleUrl: './workflow-timeline.component.css',
})
export class WorkflowTimelineComponent implements OnInit {
  entityType = input.required<string>();
  entityId = input.required<string>();

  private workflowService = inject(WorkflowService);

  history = signal<WorkflowHistoryEntry[]>([]);
  loading = signal(false);

  ngOnInit() {
    this.loadHistory();
  }

  async loadHistory() {
    this.loading.set(true);
    try {
      const response = await this.workflowService.getHistory(
        this.entityType(),
        this.entityId()
      );
      if (response.success) {
        this.history.set(response.data);
      }
    } catch (error) {
      console.error('Failed to load workflow history:', error);
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
