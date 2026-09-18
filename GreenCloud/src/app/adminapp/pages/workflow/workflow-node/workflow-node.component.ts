import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiagramNode, WorkflowAction } from '../models/workflow.model';

@Component({
  selector: 'app-workflow-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workflow-node.component.html',
  styleUrls: ['./workflow-node.component.css'],
})
export class WorkflowNodeComponent {
  @Input() node!: DiagramNode;
  @Input() isCurrent = false;
  @Input() isPassed = false;
  @Input() isClickable = true;
  @Input() showActions = true;

  @Output() nodeClick = new EventEmitter<DiagramNode>();
  @Output() editClick = new EventEmitter<DiagramNode>();
  @Output() deleteClick = new EventEmitter<DiagramNode>();
  @Output() actionClick = new EventEmitter<{ node: DiagramNode; action: WorkflowAction }>();

  get stage() { return this.node.stage; }

  get stageTypeLabel(): string {
    switch (this.stage.stageType) {
      case 'terminal': return 'END';
      case 'reject': return 'REJECT';
      case 'hold': return 'HOLD';
      default: return this.stage.isInitial ? 'START' : '';
    }
  }

  get stageTypeClass(): string {
    return `wf-node__tag--${this.stage.stageType || (this.stage.isInitial ? 'start' : 'normal')}`;
  }

  get stageNumber(): string {
    return String(this.stage.sequence).padStart(2, '0');
  }

  get actionColor(): string {
    const colors: Record<string, string> = {
      primary: '#0d9488', success: '#16a34a', danger: '#dc2626',
      warning: '#d97706', info: '#2563eb', secondary: '#6b7280'
    };
    return colors[this.node.color] || colors['primary'];
  }

  onNodeClick() {
    this.nodeClick.emit(this.node);
  }

  onEdit(e: Event) {
    e.stopPropagation();
    this.editClick.emit(this.node);
  }

  onDelete(e: Event) {
    e.stopPropagation();
    this.deleteClick.emit(this.node);
  }

  onActionClick(action: WorkflowAction, e: Event) {
    e.stopPropagation();
    this.actionClick.emit({ node: this.node, action });
  }

  getActionColor(color: string): string {
    const c: Record<string, string> = {
      primary: '#0d9488', success: '#16a34a', danger: '#dc2626',
      warning: '#d97706', info: '#2563eb', secondary: '#6b7280'
    };
    return c[color] || c['primary'];
  }
}
