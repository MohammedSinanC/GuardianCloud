import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  /** Whether dialog is visible */
  isOpen = signal(false);

  /** Current dialog configuration */
  data = signal<ConfirmDialogData>({
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
  });

  /** Resolve function for the promise */
  private resolveFn: ((result: boolean) => void) | null = null;

  /**
   * Show a confirmation dialog and return a Promise<boolean>.
   *
   * Usage:
   *   const confirmed = await this.confirmService.confirm({
   *     title: 'Delete Role',
   *     message: 'Are you sure you want to delete "Admin"?',
   *     confirmText: 'Delete',
   *     type: 'danger',
   *   });
   *   if (confirmed) { ... }
   */
  confirm(config: ConfirmDialogData): Promise<boolean> {
    this.data.set({
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      type: 'danger',
      ...config,
    });
    this.isOpen.set(true);

    return new Promise<boolean>((resolve) => {
      this.resolveFn = resolve;
    });
  }

  /** User confirmed */
  onConfirm(): void {
    this.isOpen.set(false);
    this.resolveFn?.(true);
    this.resolveFn = null;
  }

  /** User cancelled */
  onCancel(): void {
    this.isOpen.set(false);
    this.resolveFn?.(false);
    this.resolveFn = null;
  }
}
