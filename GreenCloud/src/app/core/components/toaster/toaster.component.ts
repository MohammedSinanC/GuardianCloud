import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToasterService, Toast } from '../../services/toaster.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-toaster',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(120%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.4,0,0.2,1)', style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('250ms cubic-bezier(0.4,0,0.2,1)', style({ transform: 'translateX(120%)', opacity: 0 })),
      ]),
    ]),
  ],
  template: `
    <div class="toast-container">
      @for (toast of toaster.toasts(); track toast.id) {
        <div class="toast-item" [class]="'toast-item--' + toast.type" @slideIn>
          <span class="material-icons-outlined toast-icon">{{ getIcon(toast.type) }}</span>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" (click)="toaster.dismiss(toast.id)">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
      pointer-events: none;
    }

    .toast-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      font-size: 13px;
      font-weight: 500;
      color: #fff;
      pointer-events: auto;
      backdrop-filter: blur(4px);
    }

    .toast-item--success {
      background: linear-gradient(135deg, #059669, #10b981);
    }
    .toast-item--error {
      background: linear-gradient(135deg, #dc2626, #ef4444);
    }
    .toast-item--warning {
      background: linear-gradient(135deg, #d97706, #f59e0b);
    }
    .toast-item--info {
      background: linear-gradient(135deg, #0284c7, #38bdf8);
    }

    .toast-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .toast-message {
      flex: 1;
      line-height: 1.4;
      word-break: break-word;
    }

    .toast-close {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;
      flex-shrink: 0;
      border-radius: 4px;
      transition: background 0.15s;
    }
    .toast-close:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }
    .toast-close .material-icons-outlined {
      font-size: 16px;
    }

    @media (max-width: 480px) {
      .toast-container {
        right: 10px;
        left: 10px;
        max-width: none;
      }
    }
  `],
})
export class ToasterComponent {
  toaster = inject(ToasterService);

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };
    return icons[type] || 'info';
  }
}
