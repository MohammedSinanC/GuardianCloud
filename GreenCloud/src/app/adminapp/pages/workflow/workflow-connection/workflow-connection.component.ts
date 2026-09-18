import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-workflow-connection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workflow-connection.component.html',
  styleUrls: ['./workflow-connection.component.css'],
})
export class WorkflowConnectionComponent {
  @Input() label = '';
  @Input() color = '#94a3b8';
  @Input() type: 'normal' | 'approve' | 'reject' = 'normal';
  @Input() direction: 'down' | 'right' = 'down';
}
