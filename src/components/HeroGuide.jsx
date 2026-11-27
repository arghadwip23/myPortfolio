"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

function Plus({ className = "", size = 24 }) {
  return (
    <span
      className={`guide-plus absolute -translate-x-1/2 -translate-y-1/2 ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="absolute left-1/2 top-0 h-full w-px bg-current" />
      <span className="absolute left-0 top-1/2 h-px w-full bg-current" />
    </span>
  );
}

export default function HeroGuides() {
  const root = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".guide-v", { scaleY: 0, transformOrigin: "top", duration: 1.2, ease: "power3.out", stagger: 0.1 });
      gsap.from(".guide-h", { scaleX: 0, transformOrigin: "left", duration: 1.2, ease: "power3.out", stagger: 0.1, delay: 0.2 });
      gsap.from(".guide-plus, .guide-label", { opacity: 0, duration: 0.8, delay: 0.9, stagger: 0.08 });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={root}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden text-neutral-900/15 md:block"
    >
      {/* vertical rails */}
      <div className="guide-v absolute inset-y-0 left-[var(--guide-x)] w-px bg-current" />
      <div className="guide-v absolute inset-y-0 right-[var(--guide-x)] w-px bg-current" />

      {/* horizontal rules */}
      <div className="guide-h absolute inset-x-0 top-[64px] h-px bg-current" />
      <div className="guide-h absolute inset-x-0 top-[104px] border-t border-dashed border-current" />

      {/* captions */}
      <span className="guide-label absolute left-[calc(var(--guide-x)_+_20px)] top-[76px] text-xs text-neutral-500">
        Not made for the moment.
      </span>
      <span className="guide-label absolute right-[calc(var(--guide-x)_+_20px)] top-[76px] text-xs text-neutral-500">
        Built for what follows.
      </span>

      {/* crosshairs */}
      <Plus className="left-[var(--guide-x)] top-[64px]" size={16} />
      <Plus className="right-[var(--guide-x)] top-[64px]" size={16} />
      <Plus className="left-[var(--guide-x)] top-[104px]" size={16} />
      <Plus className="right-[var(--guide-x)] top-[104px]" size={16} />
    </div>
  );
}