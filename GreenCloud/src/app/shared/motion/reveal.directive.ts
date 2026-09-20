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
 * Adds `.reveal` (+ optional `.reveal--{variant}`) to the host and toggles
 * `.visible` when it enters the viewport. The animation itself lives in
 * global SCSS (styles.scss); this directive only owns the observation state.
 *
 * Usage: <div appReveal [revealDelay]="2" revealVariant="left"> ... </div>
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  /** Stagger slot (0,1,2,...) → --reveal-delay CSS variable. */
  revealDelay = input(0, { transform: numberAttribute });

  /** Optional reveal variant: 'left' | 'right' | 'zoom' | 'mask'. */
  revealVariant = input<'left' | 'right' | 'zoom' | 'mask' | ''>('');

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    const node: HTMLElement = this.el.nativeElement;
    node.classList.add('reveal');
    if (this.revealVariant()) {
      node.classList.add(`reveal--${this.revealVariant()}`);
    }
    if (this.revealDelay() > 0) {
      node.style.setProperty('--reveal-delay', `${this.revealDelay() * 90}ms`);
    }

    if (!isPlatformBrowser(this.platformId) || typeof IntersectionObserver === 'undefined') {
      // Never hide content on the server or in ancient browsers.
      node.classList.add('visible');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.classList.add('visible');
            this.observer?.disconnect();
            this.observer = null;
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
