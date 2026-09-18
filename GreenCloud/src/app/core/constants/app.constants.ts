/**
 * ============================================================
 * APPLICATION CONSTANTS
 * ============================================================
 * Global constants used across the application.
 * ============================================================
 */

/** Scroll threshold in pixels for header sticky behavior */
export const SCROLL_THRESHOLD = 50;

/** Animation durations in milliseconds */
export const ANIM_DURATION = {
  fast: 200,
  normal: 300,
  slow: 500,
} as const;

/** Counter animation duration in milliseconds */
export const COUNTER_DURATION = 2000;

/** IntersectionObserver threshold for scroll animations */
export const INTERSECTION_THRESHOLD = 0.15;
