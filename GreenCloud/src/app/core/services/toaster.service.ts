import { Injectable, signal } from '@angular/core';
import { resolveToastMessages, ToastActionKey } from '../config/toast-messages';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToasterService {
  private counter = 0;

  /** Active toasts */
  toasts = signal<Toast[]>([]);

  private readonly durations: Record<ToastType, number> = {
    success: 3000,
    info: 3000,
    warning: 4000,
    error: 5000,
  };

  private readonly icons: Record<ToastType, string> = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
  };

  // ===== Action-based API =====

  /** Show success toast for a resolved action key, e.g. 'quotation.send' */
  success(messageOrAction: string): void {
    const msg = this.resolveIfAction(messageOrAction);
    this.show('success', msg);
  }

  /** Show error toast for a resolved action key, e.g. 'quotation.send' */
  error(messageOrAction: string): void {
    const msg = this.resolveIfAction(messageOrAction);
    this.show('error', msg);
  }

  warning(message: string): void {
    this.show('warning', message);
  }

  info(message: string): void {
    this.show('info', message);
  }

  /**
   * Show toast from an action key + backend message.
   * Priority: backend message > action-specific message > fallback.
   */
  fromAction(actionKey: string, backendMessage?: string, isError = false): void {
    const resolved = resolveToastMessages(actionKey);
    const type: ToastType = isError ? 'error' : 'success';

    // Priority: backend message > resolved action message > raw key
    let message = backendMessage || '';
    if (!message && resolved) {
      message = isError ? resolved.error : resolved.success;
    }
    if (!message) {
      message = isError ? 'An error occurred.' : 'Operation completed successfully.';
    }

    this.show(type, message);
  }

  // ===== Core =====

  show(type: ToastType, message: string, duration?: number): void {
    if (!message) return; // Never show empty toasts
    const id = ++this.counter;
    const toast: Toast = {
      id,
      type,
      message,
      duration: duration ?? this.durations[type],
    };
    this.toasts.update((t) => [...t, toast]);
    setTimeout(() => this.dismiss(id), toast.duration);
  }

  dismiss(id: number): void {
    this.toasts.update((t) => t.filter((item) => item.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }

  getIcon(type: ToastType): string {
    return this.icons[type];
  }

  // ===== Internal =====

  /** If the string looks like a dot-notation action key, resolve it. Otherwise return as-is. */
  private resolveIfAction(keyOrMessage: string): string {
    if (keyOrMessage.includes('.')) {
      const resolved = resolveToastMessages(keyOrMessage);
      if (resolved) return resolved.success;
    }
    return keyOrMessage;
  }
}
