/**
 * Shared motion primitives for the public site.
 * One owner for scroll-triggered presentation state:
 *  - RevealDirective  → enter-viewport fade/slide reveals (appReveal)
 *  - CountUpDirective → animated numeric statistics (appCountUp)
 *  - ParallaxDirective → subtle scroll parallax (appParallax)
 *  - VideoBgDirective → performance-honest background video (appVideoBg)
 */
export * from './reveal.directive';
export * from './count-up.directive';
export * from './parallax.directive';
export * from './video-bg.directive';
