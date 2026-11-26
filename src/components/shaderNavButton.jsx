"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createShaderButton, DEFAULT_PALETTE } from "./shader-engine";

const FALLBACK_GRADIENT =
  "bg-[linear-gradient(90deg,#d8ff2a_0%,#a9d600_35%,#0a0a0a_90%)]";

/**
 * Props:
 *  href, children, onClick
 *  className - display, padding, radius and text size (override per usage)
 *  colors    - 4-stop cyclic palette, e.g. ["#a9d600", "#d2f51c", "#b4e000", "#c9f21a"]
 *  speed     - palette cycles per second
 *  glitch    - 0 disables, 1 is full strength
 */
export default function ShaderNavButton({
  href,
  children,
  className = "inline-flex items-center rounded-full px-5 py-2.5 text-sm",
  onClick,
  colors = DEFAULT_PALETTE,
  speed = 0.08,
  glitch = 0.35,
  grain = 0.9,
}) {
  const canvasRef = useRef(null);
  const handleRef = useRef(null);
  const optsRef = useRef({ colors, speed, glitch, grain });
  optsRef.current = { colors, speed, glitch, grain };
  const [fallback, setFallback] = useState(false);

  // Mount: create the shader instance, observe size, respect reduced motion
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handle = createShaderButton(canvas, optsRef.current, () => setFallback(true));
    if (!handle) {
      setFallback(true);
      return;
    }
    handleRef.current = handle;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotion = () => handle.setAnimated(!mq.matches);
    applyMotion();
    mq.addEventListener("change", applyMotion);

    const measure = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      handle.resize(
        Math.round(canvas.clientWidth * dpr),
        Math.round(canvas.clientHeight * dpr)
      );
    };
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);
    measure();

    return () => {
      ro.disconnect();
      mq.removeEventListener("change", applyMotion);
      handle.dispose();
      handleRef.current = null;
    };
  }, []);

  // Live-update colors / speed / glitch without recreating anything
   const colorKey = colors.join(",");
  useEffect(() => {
    if (handleRef.current) handleRef.current.update({ colors, speed, glitch, grain });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorKey, speed, glitch, grain]);

  return (
    <Link
      href={href}
      onClick={onClick}
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch" && handleRef.current) handleRef.current.setHover(true);
      }}
      onPointerLeave={() => handleRef.current && handleRef.current.setHover(false)}
      onFocus={(e) => {
        if (e.currentTarget.matches(":focus-visible") && handleRef.current) {
          handleRef.current.setHover(true);
        }
      }}
      onBlur={() => handleRef.current && handleRef.current.setHover(false)}
      className={`group relative isolate shrink-0 overflow-hidden whitespace-nowrap font-semibold text-white ${FALLBACK_GRADIENT} border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-10px_rgba(190,235,0,0.5)] transition-transform duration-150 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9f21a] ${className}`}
    >
      <canvas
        ref={canvasRef}
        className={`btn-shader pointer-events-none absolute inset-0 z-0 h-full w-full ${
          fallback ? "hidden" : ""
        }`}
        aria-hidden="true"
      />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </Link>
  );
}