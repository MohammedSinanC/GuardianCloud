import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (confirmService.isOpen()) {
      <div class="cd-overlay" (click)="confirmService.onCancel()">
        <div class="cd-box" (click)="$event.stopPropagation()">
          <div class="cd-icon" [class]="'cd-icon--' + confirmService.data().type">
            <span class="material-icons-outlined">{{ getIcon() }}</span>
          </div>
          <h3 class="cd-title">{{ confirmService.data().title }}</h3>
          <p class="cd-message">{{ confirmService.data().message }}</p>
          <div class="cd-actions">
            <button class="cd-btn cd-btn--cancel" (click)="confirmService.onCancel()">
              {{ confirmService.data().cancelText }}
            </button>
            <button class="cd-btn cd-btn--confirm" [class]="'cd-btn--' + confirmService.data().type" (click)="confirmService.onConfirm()">
              {{ confirmService.data().confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cd-overlay {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000001;
      backdrop-filter: blur(2px);
    }

    .cd-box {
      background: #fff;
      border-radius: 16px;
      width: 400px;
      max-width: 90vw;
      padding: 32px;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
    }

    .cd-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .cd-icon .material-icons-outlined { font-size: 28px; color: #fff; }

    .cd-icon--danger  { background: linear-gradient(135deg, #dc2626, #ef4444); }
    .cd-icon--warning { background: linear-gradient(135deg, #d97706, #f59e0b); }
    .cd-icon--info    { background: linear-gradient(135deg, #0284c7, #38bdf8); }

    .cd-title {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
      color: #111827;
    }

    .cd-message {
      margin: 0 0 24px;
      font-size: 14px;
      color: #6b7280;
      line-height: 1.5;
    }

    .cd-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
    }

    .cd-btn {
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }

    .cd-btn--cancel {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }
    .cd-btn--cancel:hover { background: #e5e7eb; }

    .cd-btn--confirm { color: #fff; }
    .cd-btn--danger  { background: linear-gradient(135deg, #dc2626, #ef4444); }
    .cd-btn--danger:hover { background: linear-gradient(135deg, #b91c1c, #dc2626); }
    .cd-btn--warning { background: linear-gradient(135deg, #d97706, #f59e0b); }
    .cd-btn--warning:hover { background: linear-gradient(135deg, #b45309, #d97706); }
    .cd-btn--info    { background: linear-gradient(135deg, #0284c7, #38bdf8); }
    .cd-btn--info:hover { background: linear-gradient(135deg, #0369a1, #0284c7); }
  `],
})
export class ConfirmDialogComponent {
  confirmService = inject(ConfirmService);

  getIcon(): string {
    const icons: Record<string, string> = {
      danger: 'warning',
      warning: 'report_problem',
      info: 'info',
    };
    return icons[this.confirmService.data().type || 'danger'] || 'warning';
  }
}
