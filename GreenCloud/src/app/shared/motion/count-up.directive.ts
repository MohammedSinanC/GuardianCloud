import {
  Directive,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  effect,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { COUNTER_DURATION } from '../../core/constants/app.constants';

/**
 * Animated count-up for numeric text. The bound value is the single source
 * of truth; the directive animates the host's text content from 0 to the
 * target with an ease-out curve once the element scrolls into view.
 *
 * - Non-numeric values (e.g. "24/7") render as-is, no animation.
 * - Values that arrive late (async API) trigger the animation when set.
 * - SSR / reduced motion: the final value renders immediately.
 *
 * Usage: <span [appCountUp]="value()">{{ value() }}</span>
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective implements OnDestroy {
  /** Target numeric value. Re-evaluated whenever the binding changes. */
  appCountUp = input<number | string | undefined>(undefined);

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private observer: IntersectionObserver | null = null;
  private rafId = 0;
  private target: number | null = null;
  private inView = false;
  private animateLocked = false;

  constructor() {
    effect(() => this.onValueChange(this.appCountUp()));
  }

  private onValueChange(raw: number | string | undefined): void {
    const node: HTMLElement = this.el.nativeElement;
    const value = raw ?? '';
    const parsed = Number(value);

    // Non-numeric (or not ready) — show the raw text, never animate.
    if (value === '' || !Number.isFinite(parsed)) {
      this.stopAnimation();
      this.target = null;
      node.textContent = String(value);
      return;
    }

    this.target = parsed;

    if (!isPlatformBrowser(this.platformId)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.textContent = String(parsed);
      return;
    }

    if (this.inView) {
      this.animate();
    } else {
      this.observe();
    }
  }

  private observe(): void {
    if (this.observer || typeof IntersectionObserver === 'undefined') {
      if (typeof IntersectionObserver === 'undefined') {
        this.inView = true;
        this.animate();
      }
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.inView = true;
            this.observer?.disconnect();
            this.observer = null;
            this.animate();
          }
        }
      },
      { threshold: 0.4 }
    );
    this.observer.observe(this.el.nativeElement);
  }

  private animate(): void {
    if (this.target === null || this.animateLocked) return;
    const node: HTMLElement = this.el.nativeElement;
    const target = this.target;
    const startTime = performance.now();

    this.animateLocked = true;
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / COUNTER_DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = String(Math.round(eased * target));
      if (progress < 1) {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.animateLocked = false;
      }
    };
    this.rafId = requestAnimationFrame(step);
  }

  private stopAnimation(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.animateLocked = false;
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.stopAnimation();
  }
}
