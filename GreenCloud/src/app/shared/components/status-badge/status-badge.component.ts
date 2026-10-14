import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [ngClass]="badgeClass()">
      {{ label() }}
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: capitalize;
      white-space: nowrap;
    }
    .badge-active { background: #dcfce7; color: #166534; }
    .badge-created { background: #e0e7ff; color: #3730a3; }
    .badge-submitted { background: #dbeafe; color: #1d4ed8; }
    .badge-draft { background: #f1f5f9; color: #475569; }
    .badge-pending_approval { background: #fef3c7; color: #92400e; }
    .badge-approved { background: #dcfce7; color: #166534; }
    .badge-completed { background: #dbeafe; color: #1e40af; }
    .badge-cancelled { background: #f3f4f6; color: #6b7280; }
    .badge-rejected { background: #fef2f2; color: #991b1b; }
    .badge-on-hold { background: #fef9c3; color: #854d0e; }
    .badge-urgent { background: #fef2f2; color: #dc2626; }
    .badge-normal { background: #f0fdfa; color: #0d9488; }
    .badge-emergency { background: #dc2626; color: white; }
    .badge-default { background: #f3f4f6; color: #374151; }
  `],
})
export class StatusBadgeComponent {
  status = input.required<string>();

  /**
   * Optional friendly text (e.g. a master's label) while the colour still
   * derives from the status code.
   */
  text = input<string>('');

  // Fall back to an empty value so a badge never breaks rendering (e.g. while a
  // hot-reload re-creates the component before its input is bound).
  label = computed(() => this.text().trim() || (this.status() ?? '').replace(/_/g, ' '));

  badgeClass = computed(() => {
    const s = (this.status() ?? '').toLowerCase();
    if (s === 'created') return 'badge-created';
    if (s === 'submitted') return 'badge-submitted';
    if (s === 'draft') return 'badge-draft';
    if (s === 'pending_approval') return 'badge-pending_approval';
    if (s === 'approved') return 'badge-approved';
    if (s === 'active') return 'badge-active';
    if (s === 'completed') return 'badge-completed';
    if (s === 'cancelled') return 'badge-cancelled';
    if (s === 'rejected') return 'badge-rejected';
    if (s === 'on_hold') return 'badge-on-hold';
    if (s === 'urgent') return 'badge-urgent';
    if (s === 'normal') return 'badge-normal';
    if (s === 'emergency') return 'badge-emergency';
    return 'badge-default';
  });
}
