"use client"

/**
 * Lottie Empty State Component
 * @description Animated empty state using Lottie for pages where data hasn't been
 * computed or synced yet. Shows a soothing animation with a message that data
 * is being prepared.
 * @module components/shared/lottie-empty-state
 */

import { Suspense, lazy } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const Lottie = lazy(() => import("lottie-react"))

/**
 * Static Lottie animation data for a chart/analytics loading animation.
 * Using a minimal bar-chart-growing animation inline to avoid external fetch.
 */
const ANALYTICS_LOADING_ANIMATION = {
  v: "5.7.1",
  fr: 30,
  ip: 0,
  op: 90,
  w: 200,
  h: 200,
  nm: "loading",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 0,
      ty: 4,
      nm: "bar1",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [60, 140, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 30, 100], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 30, s: [100, 100, 100], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 60, s: [100, 60, 100], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 90, s: [100, 30, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: "rc",
          d: 1,
          s: { a: 0, k: [20, 60] },
          p: { a: 0, k: [0, -30] },
          r: { a: 0, k: 4 },
        },
        {
          ty: "fl",
          c: { a: 0, k: [0.4, 0.56, 1, 1] },
          o: { a: 0, k: 60 },
        },
      ],
      ip: 0,
      op: 90,
      st: 0,
    },
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "bar2",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [90, 140, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 60, 100], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 25, s: [100, 100, 100], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 55, s: [100, 40, 100], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 90, s: [100, 60, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: "rc",
          d: 1,
          s: { a: 0, k: [20, 60] },
          p: { a: 0, k: [0, -30] },
          r: { a: 0, k: 4 },
        },
        {
          ty: "fl",
          c: { a: 0, k: [0.35, 0.5, 0.95, 1] },
          o: { a: 0, k: 70 },
        },
      ],
      ip: 0,
      op: 90,
      st: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "bar3",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [120, 140, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 80, 100], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 35, s: [100, 40, 100], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 65, s: [100, 100, 100], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 90, s: [100, 80, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: "rc",
          d: 1,
          s: { a: 0, k: [20, 60] },
          p: { a: 0, k: [0, -30] },
          r: { a: 0, k: 4 },
        },
        {
          ty: "fl",
          c: { a: 0, k: [0.3, 0.45, 0.9, 1] },
          o: { a: 0, k: 80 },
        },
      ],
      ip: 0,
      op: 90,
      st: 0,
    },
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: "bar4",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [150, 140, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 50, 100], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 20, s: [100, 80, 100], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 50, s: [100, 100, 100], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 90, s: [100, 50, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: "rc",
          d: 1,
          s: { a: 0, k: [20, 60] },
          p: { a: 0, k: [0, -30] },
          r: { a: 0, k: 4 },
        },
        {
          ty: "fl",
          c: { a: 0, k: [0.25, 0.4, 0.85, 1] },
          o: { a: 0, k: 90 },
        },
      ],
      ip: 0,
      op: 90,
      st: 0,
    },
  ],
}

/**
 * Props for the LottieEmptyState component
 */
interface LottieEmptyStateProps {
  /** Main title text */
  title?: string
  /** Description text below the title */
  description?: string
  /** Optional custom Lottie animation data (JSON object) */
  animationData?: Record<string, unknown>
}

/**
 * Lottie animation fallback skeleton
 */
function LottieFallback() {
  return (
    <div className="flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <Skeleton className="size-24 rounded-full" />
    </div>
  )
}

/**
 * Animated empty state component with Lottie animation
 * @param props - Component props
 * @param props.title - Heading text
 * @param props.description - Subtext description
 * @param props.animationData - Optional custom Lottie JSON data
 * @returns Animated empty state card
 */
export function LottieEmptyState({
  title = "Still getting your data",
  description = "Please wait while we calculate your analytics. This usually takes a few minutes after your first sync.",
  animationData,
}: LottieEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="border-border/50 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Suspense fallback={<LottieFallback />}>
              <Lottie
                animationData={animationData ?? ANALYTICS_LOADING_ANIMATION}
                loop
                style={{ width: 180, height: 180 }}
              />
            </Suspense>
          </motion.div>

          <motion.div
            className="mt-2 space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </motion.div>

          <motion.div
            className="mt-4 flex items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <span className="size-1.5 animate-pulse rounded-full bg-primary/60" />
            <span
              className="size-1.5 animate-pulse rounded-full bg-primary/60"
              style={{ animationDelay: "0.2s" }}
            />
            <span
              className="size-1.5 animate-pulse rounded-full bg-primary/60"
              style={{ animationDelay: "0.4s" }}
            />
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
