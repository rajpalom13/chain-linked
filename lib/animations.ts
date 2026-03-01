/**
 * Framer Motion Animation Variants & Utilities
 * @description Centralized animation system for ChainLinked UI
 * @module lib/animations
 */

import { Variants, Transition, TargetAndTransition } from 'framer-motion'

/* =============================================================================
   TIMING CONFIGURATION
   ============================================================================= */

/**
 * Easing curves for smooth animations
 */
export const easings = {
  smooth: [0.16, 1, 0.3, 1] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
  easeOut: [0, 0, 0.2, 1] as const,
  easeIn: [0.4, 0, 1, 1] as const,
}

/**
 * Duration presets in seconds
 */
export const durations = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  entrance: 0.6,
  dramatic: 0.8,
  counter: 1.2,
}

/**
 * Standard transition presets
 */
export const transitions: Record<string, Transition> = {
  smooth: {
    duration: durations.normal,
    ease: easings.smooth,
  },
  bounce: {
    duration: durations.normal,
    ease: easings.bounce,
  },
  entrance: {
    duration: durations.entrance,
    ease: easings.smooth,
  },
  spring: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
  },
  springBouncy: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
  },
}

/* =============================================================================
   FADE ANIMATIONS
   ============================================================================= */

/**
 * Simple fade in/out
 */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

/**
 * Fade with slide up (most common entrance)
 */
export const fadeSlideUpVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.entrance,
      ease: easings.smooth,
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    }
  },
}

/**
 * Fade with slide down
 */
export const fadeSlideDownVariants: Variants = {
  initial: {
    opacity: 0,
    y: -20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.entrance,
      ease: easings.smooth,
    }
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    }
  },
}

/**
 * Fade with slide from left
 */
export const fadeSlideLeftVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.entrance,
      ease: easings.smooth,
    }
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    }
  },
}

/**
 * Fade with slide from right
 */
export const fadeSlideRightVariants: Variants = {
  initial: {
    opacity: 0,
    x: 20
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.entrance,
      ease: easings.smooth,
    }
  },
  exit: {
    opacity: 0,
    x: 10,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    }
  },
}

/* =============================================================================
   SCALE ANIMATIONS
   ============================================================================= */

/**
 * Scale pop animation (for cards, buttons)
 */
export const scalePopVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.smooth,
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    }
  },
}

/**
 * Scale with bounce effect
 */
export const scaleBounceVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.bounce,
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: durations.fast,
    }
  },
}

/* =============================================================================
   STAGGER CONTAINERS
   ============================================================================= */

/**
 * Container for staggered children animations
 */
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    }
  },
}

/**
 * Fast stagger container (for pills, badges)
 */
export const staggerFastContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    }
  },
  exit: {
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    }
  },
}

/**
 * Slow stagger container (for dramatic reveals)
 */
export const staggerSlowContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    }
  },
  exit: {
    transition: {
      staggerChildren: 0.08,
      staggerDirection: -1,
    }
  },
}

/**
 * Grid stagger container
 */
export const staggerGridContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    }
  },
}

/* =============================================================================
   STAGGER CHILDREN
   ============================================================================= */

/**
 * Standard stagger child (use with staggerContainerVariants)
 */
export const staggerItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.smooth,
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: durations.fast,
    }
  },
}

/**
 * Scale stagger child
 */
export const staggerScaleItemVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.smooth,
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: durations.fast,
    }
  },
}

/* =============================================================================
   HOVER & TAP ANIMATIONS
   ============================================================================= */

/**
 * Card hover effect (lift + shadow)
 */
export const cardHoverProps = {
  whileHover: {
    y: -4,
    transition: {
      duration: durations.fast,
      ease: easings.smooth,
    }
  } as TargetAndTransition,
  whileTap: {
    scale: 0.98,
    transition: {
      duration: durations.fast,
    }
  } as TargetAndTransition,
}

/**
 * Button hover effect
 */
export const buttonHoverProps = {
  whileHover: {
    scale: 1.02,
    transition: {
      duration: durations.fast,
      ease: easings.smooth,
    }
  } as TargetAndTransition,
  whileTap: {
    scale: 0.98,
    transition: {
      duration: durations.fast,
    }
  } as TargetAndTransition,
}

/**
 * Icon button hover effect
 */
export const iconButtonHoverProps = {
  whileHover: {
    scale: 1.1,
    transition: {
      duration: durations.fast,
      ease: easings.bounce,
    }
  } as TargetAndTransition,
  whileTap: {
    scale: 0.9,
    transition: {
      duration: durations.fast,
    }
  } as TargetAndTransition,
}

/**
 * Link hover effect (subtle)
 */
export const linkHoverProps = {
  whileHover: {
    x: 2,
    transition: {
      duration: durations.fast,
      ease: easings.smooth,
    }
  } as TargetAndTransition,
}

/* =============================================================================
   SPECIAL ANIMATIONS
   ============================================================================= */

/**
 * Floating animation (for hero elements)
 */
export const floatVariants: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-8, 8, -8],
    transition: {
      duration: 4,
      ease: 'easeInOut',
      repeat: Infinity,
    }
  },
}

/**
 * Pulse animation (for notifications, badges)
 */
export const pulseVariants: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      ease: 'easeInOut',
      repeat: Infinity,
    }
  },
}

/**
 * Shimmer animation (for loading states)
 */
export const shimmerVariants: Variants = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: {
      duration: 1.5,
      ease: 'easeInOut',
      repeat: Infinity,
    }
  },
}

/**
 * Number counter animation config
 */
export const counterTransition: Transition = {
  duration: durations.counter,
  ease: easings.easeOut,
}

/* =============================================================================
   PAGE TRANSITIONS
   ============================================================================= */

/**
 * Page enter/exit animation
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.entrance,
      ease: easings.smooth,
      when: 'beforeChildren',
      staggerChildren: 0.1,
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: durations.normal,
      ease: easings.easeIn,
    }
  },
}

/* =============================================================================
   MODAL ANIMATIONS
   ============================================================================= */

/**
 * Modal backdrop animation
 */
export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: durations.normal,
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: durations.fast,
    }
  },
}

/**
 * Modal content animation
 */
export const modalVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.smooth,
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    }
  },
}

/**
 * Slide-in panel animation (from right)
 */
export const slideInRightVariants: Variants = {
  initial: {
    opacity: 0,
    x: '100%',
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.normal,
      ease: easings.smooth,
    }
  },
  exit: {
    opacity: 0,
    x: '100%',
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    }
  },
}

/* =============================================================================
   TABLE ANIMATIONS
   ============================================================================= */

/**
 * Table row stagger container
 */
export const tableContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.1,
    }
  },
}

/**
 * Table row animation
 */
export const tableRowVariants: Variants = {
  initial: {
    opacity: 0,
    x: -10
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.normal,
      ease: easings.smooth,
    }
  },
}

/* =============================================================================
   CHART ANIMATIONS
   ============================================================================= */

/**
 * Chart path draw animation
 */
export const chartPathVariants: Variants = {
  initial: {
    pathLength: 0,
    opacity: 0,
  },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: durations.dramatic,
        ease: easings.smooth,
      },
      opacity: {
        duration: durations.fast,
      }
    }
  },
}

/**
 * Chart bar grow animation
 */
export const chartBarVariants: Variants = {
  initial: {
    scaleY: 0,
    opacity: 0,
  },
  animate: {
    scaleY: 1,
    opacity: 1,
    transition: {
      duration: durations.slow,
      ease: easings.smooth,
    }
  },
}

/* =============================================================================
   UTILITY FUNCTIONS
   ============================================================================= */

/**
 * Create a delay variant for staggered animations
 * @param delay - Delay in seconds
 */
export function withDelay(variants: Variants, delay: number): Variants {
  return {
    ...variants,
    animate: {
      ...(variants.animate as object),
      transition: {
        ...((variants.animate as { transition?: Transition })?.transition || {}),
        delay,
      }
    }
  }
}

/**
 * Create custom stagger container with specific timing
 * @param staggerDelay - Delay between children in seconds
 * @param initialDelay - Initial delay before first child in seconds
 */
export function createStaggerContainer(
  staggerDelay: number = 0.1,
  initialDelay: number = 0.1
): Variants {
  return {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      }
    },
    exit: {
      transition: {
        staggerChildren: staggerDelay / 2,
        staggerDirection: -1,
      }
    },
  }
}

/**
 * Viewport animation config for scroll-triggered animations
 */
export const viewportConfig = {
  once: true,
  threshold: 0.3,
  rootMargin: '-50px',
}

/**
 * Viewport animation config for repeating animations
 */
export const viewportRepeatConfig = {
  once: false,
  threshold: 0.3,
  rootMargin: '-50px',
}

/* =============================================================================
   COMPOSE MODE ANIMATIONS
   ============================================================================= */

/**
 * Compose mode content transition (basic ↔ advanced swap)
 */
export const composeModeVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: easings.smooth },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.99,
    transition: { duration: 0.2 },
  },
}

/**
 * Chat message entrance animation
 */
export const chatMessageVariants: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: durations.normal, ease: easings.smooth },
  },
}

/**
 * MCQ option pill entrance animation
 */
export const mcqOptionVariants: Variants = {
  initial: { opacity: 0, scale: 0.8, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easings.bounce },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: durations.fast },
  },
}
