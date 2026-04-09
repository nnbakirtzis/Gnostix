"use client";

/**
 * Full-viewport decorative layer using Aceternity NoiseBackground.
 * Sits behind app chrome; ignores pointer events and respects reduced motion.
 */
import { useReducedMotion } from "motion/react";
import { NoiseBackground } from "@/components/ui/noise-background";

/** Sand / obsidian radial accents — alphas tuned so the glow reads clearly but stays ambient. */
const GNOSTIX_GRADIENT_COLORS = [
  "rgba(190, 152, 118, 0.45)",
  "rgba(130, 100, 75, 0.34)",
  "rgba(55, 48, 42, 0.52)",
];

export function AppBackground() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <NoiseBackground
        animating={!prefersReducedMotion}
        gradientColors={GNOSTIX_GRADIENT_COLORS}
        noiseIntensity={0.05}
        speed={0.1}
        backdropBlur={false}
        containerClassName="h-full min-h-full w-full max-w-none rounded-none border-0 bg-[#161616] p-0 shadow-none dark:bg-[#161616] dark:shadow-none"
      />
    </div>
  );
}
