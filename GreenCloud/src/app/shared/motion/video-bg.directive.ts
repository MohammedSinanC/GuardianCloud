import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Performance-honest background video: pauses when off-screen and for
 * reduced-motion users; plays only while visible. The <video> itself keeps
 * autoplay/muted/loop/playsinline attributes as a no-JS fallback.
 */
@Directive({
  selector: 'video[appVideoBg]',
  standalone: true,
})
export class VideoBgDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLVideoElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private observer: IntersectionObserver | null = null;
  private reducedMotion = false;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const video = this.el.nativeElement;
    video.muted = true;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.reducedMotion || typeof IntersectionObserver === 'undefined') {
      video.pause();
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            video.play().catch(() => {
              /* autoplay refusal — poster frame remains */
            });
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.15 }
    );
    this.observer.observe(video);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
