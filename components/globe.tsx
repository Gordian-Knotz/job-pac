"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";
import { useTheme } from "next-themes";
import { useReducedMotion } from "framer-motion";

/**
 * The overscaled dotted globe under the hero.
 *
 * Markers are real Kenyan cities rather than scattered global points — the
 * reference block dots the whole world because it sells to everyone, but this
 * board places people in Kenya and East Africa, and a globe lit over Nairobi
 * says something true. Initial rotation faces Africa rather than the Atlantic.
 *
 * cobe v2 replaced the `onRender` callback with an imperative `globe.update()`,
 * so the rotation is driven by our own requestAnimationFrame loop.
 *
 * PERFORMANCE. cobe is ~32kb drawing to a WebGL canvas. Rotation is slow, and
 * under prefers-reduced-motion no loop is started at all — one frame is drawn
 * and left. A permanently spinning canvas is a real battery and mid-range
 * device cost, and this is decoration.
 */

const MARKERS: { location: [number, number]; size: number }[] = [
  { location: [-1.2921, 36.8219], size: 0.09 }, // Nairobi
  { location: [-4.0435, 39.6682], size: 0.06 }, // Mombasa
  { location: [-0.0917, 34.768], size: 0.05 }, // Kisumu
  { location: [-0.3031, 36.08], size: 0.045 }, // Nakuru
  { location: [0.5143, 35.2698], size: 0.045 }, // Eldoret
  { location: [0.3476, 32.5825], size: 0.04 }, // Kampala
  { location: [-6.7924, 39.2083], size: 0.04 }, // Dar es Salaam
];

export function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const reduced = useReducedMotion();
  const isDark = resolvedTheme !== "light";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Longitude offset so East Africa faces the viewer.
    let phi = 4.1;
    let width = canvas.offsetWidth;
    let frame = 0;

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi,
      theta: 0.22,
      dark: isDark ? 1 : 0,
      diffuse: isDark ? 1.1 : 1.25,
      mapSamples: 16000,
      mapBrightness: isDark ? 5.4 : 2.6,
      // Dots: light grey on charcoal, mid grey on bone.
      baseColor: isDark ? [0.38, 0.38, 0.36] : [0.62, 0.62, 0.6],
      // #E8532E, the brand accent.
      markerColor: [0.91, 0.33, 0.18],
      glowColor: isDark ? [0.12, 0.12, 0.12] : [0.94, 0.94, 0.92],
      markers: MARKERS,
    });

    const onResize = () => {
      if (!canvasRef.current) return;
      width = canvasRef.current.offsetWidth;
      globe.update({ width: width * 2, height: width * 2 });
    };
    window.addEventListener("resize", onResize);

    if (!reduced) {
      const tick = () => {
        phi += 0.0016;
        globe.update({ phi });
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      globe.destroy();
    };
  }, [isDark, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="aspect-square h-auto w-full"
      style={{ contain: "layout paint size" }}
    />
  );
}
