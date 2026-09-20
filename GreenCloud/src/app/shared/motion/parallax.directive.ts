import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Parallax translation: moves the host element vertically at a fraction of
 * its scroll speed through the viewport. GPU-friendly (transform only),
 * rAF-throttled, disabled for reduced-motion users, touch devices and SSR.
 *
 * Usage: <img appParallax [parallaxSpeed]="0.18" />
 */
@Directive({
  selector: '[appParallax]',
  standalone: true,
})
export class ParallaxDirective implements OnInit, OnDestroy {
  /** 0 = static, 0.2 = element drifts at 20% of scroll delta. */
  parallaxSpeed = input(0.15, { transform: numberAttribute });

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private rafId = 0;
  private ticking = false;

  private readonly onScroll = (): void => {
    if (this.ticking) return;
    this.ticking = true;
    this.rafId = requestAnimationFrame(() => {
      this.ticking = false;
      this.applyParallax();
    });
  };

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.applyParallax();
  }

  private applyParallax(): void {
    const node: HTMLElement = this.el.nativeElement;
    const rect = node.getBoundingClientRect();
    const viewportH = window.innerHeight;
    if (rect.bottom < -200 || rect.top > viewportH + 200) return;

    // Progress of the element through the viewport: -1 (below) → 1 (above)
    const progress = (rect.top + rect.height / 2 - viewportH / 2) / (viewportH / 2 + rect.height / 2);
    const offset = Math.max(-1, Math.min(1, progress)) * this.parallaxSpeed() * 100;
    node.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.removeEventListener('scroll', this.onScroll);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}
