/**
 * Animation presets for the dashboard.
 * All presets respect prefers-reduced-motion (WCAG 2.1 G7 guardrail).
 *
 * Uses motion-v (Motion for Vue) — compatible with VariantType from motion-dom.
 */

/** Keyframe definition compatible with motion-v's variants prop */
type VariantDef = Record<string, number | string>
type VariantsMap = Record<string, VariantDef | ((custom: number) => VariantDef)>
type TransitionDef = Record<string, unknown>

/**
 * Checks prefers-reduced-motion and returns instant transitions if set.
 * Respects WCAG 2.1 G7: "Not using motion that can be turned off".
 */
function useReducedMotion(): boolean {
  if (import.meta.server) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const instantTransition: TransitionDef = { duration: 0 }

export function useDashboardAnimations() {
  const prefersReducedMotion = useReducedMotion()

  /** Fade + slide up for page content */
  const fadeSlideIn: VariantsMap = prefersReducedMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }

  const fadeSlideInTransition: TransitionDef = prefersReducedMotion
    ? instantTransition
    : { duration: 0.3, ease: 'easeOut' }

  /** Stagger children with 50ms cascade, ease-out */
  const staggerChildren: VariantsMap = prefersReducedMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 10 },
        visible: (i: number) => ({
          opacity: 1,
          y: 0,
          transition: { delay: i * 0.05, ease: 'easeOut' },
        }),
      }

  const staggerContainerTransition: TransitionDef = prefersReducedMotion
    ? instantTransition
    : { staggerChildren: 0.05, ease: 'easeOut' }

  /** Spring physics count-up (stiffness: 120, damping: 14, ~800ms) */
  const numberTicker: TransitionDef = prefersReducedMotion
    ? instantTransition
    : { type: 'spring', stiffness: 120, damping: 14, duration: 0.8 }

  /** Scale 0.95→1 + fade for modals */
  const scaleIn: VariantsMap = prefersReducedMotion
    ? { hidden: { opacity: 1, scale: 1 }, visible: { opacity: 1, scale: 1 } }
    : {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1 },
      }

  const scaleInTransition: TransitionDef = prefersReducedMotion
    ? instantTransition
    : { duration: 0.2, ease: 'easeOut' }

  /** Direction-aware transition for tabs */
  function slideDirection(direction: 'left' | 'right' = 'right'): {
    variants: VariantsMap
    transition: TransitionDef
  } {
    if (prefersReducedMotion) {
      return {
        variants: {
          enter: { opacity: 1, x: 0 },
          center: { opacity: 1, x: 0 },
          exit: { opacity: 1, x: 0 },
        },
        transition: instantTransition,
      }
    }
    const x = direction === 'right' ? 40 : -40
    return {
      variants: {
        enter: { opacity: 0, x },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -x },
      },
      transition: { duration: 0.25, ease: 'easeInOut' },
    }
  }

  return {
    fadeSlideIn,
    fadeSlideInTransition,
    staggerChildren,
    staggerContainerTransition,
    numberTicker,
    scaleIn,
    scaleInTransition,
    slideDirection,
  }
}
