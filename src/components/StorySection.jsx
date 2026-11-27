"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const BIO = [
  ["NAME", "Arghadwip Sarkar"],
  ["BASE", "Coochbehar, WB → Chennai"],
  ["STUDY", "B.Tech ECE, VIT Chennai · 2024–28"],
  ["FOCUS", "Full-stack · Android · ML · Systems"],
];

// Edit the copy to your own voice.
const CHAPTERS = [
  {
    n: "01",
    title: "Curiosity",
    text: "Started in Coochbehar, with a Navodaya entrance and a habit of asking how things work underneath.",
    cta: { label: "My story", href: "#about" },
  },
  {
    n: "02",
    title: "Foundations",
    text: "ECE at VIT Chennai: circuits, research on biomedical signal acquisition, and the SEDS Antariksh technical team.",
    cta: { label: "Experience", href: "#experience" },
  },
  {
    n: "03",
    title: "Building",
    text: "Web products, a native Android app, a C++ network firewall and ML malware research. Each one is a different layer of the stack.",
    cta: { label: "View projects", href: "#projects" },
  },
  {
    n: "04",
    title: "Shipping",
    text: "A web development internship behind me, and now looking for the next team to build real things with.",
    cta: { label: "Let's talk", href: "#contact" },
  },
];

export default function StorySection() {
  const sectionRef = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          once: true,
        },
      });

      tl.from(".story-grey", { y: 30, opacity: 0, duration: 0.8, ease: "power3.out" })
        .from(".story-black", { y: 30, opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.5")
        .from(".story-bio", { y: 16, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power2.out" }, "-=0.6")
        .from(".story-row", { y: 24, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power3.out" }, "-=0.3");
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative w-full border-b border-neutral-900/15 bg-white text-neutral-950"
    >
      {/* rails: same offset as HeroGuides, so the vertical lines continue */}
      <div className="md:mx-[var(--guide-x)] md:border-x md:border-neutral-900/15">
        {/* HEADER */}
        <div className="grid gap-10 px-6 pb-14 pt-20 md:grid-cols-12 md:px-12 md:pb-20 md:pt-28 lg:px-[120px]">
          <h2 className="font-rajdhani text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl md:col-span-7 lg:text-5xl">
            <span className="story-grey block text-neutral-400">
              It started with wanting to know how things work.
            </span>
            <span className="story-black block">
              Now I build the systems underneath.
            </span>
          </h2>

          {/* biodata spec sheet */}
          <dl className=" text-xs md:col-span-5 md:pl-6 lg:pl-12">
            {BIO.map(([k, v]) => (
              <div
                key={k}
                className="story-bio flex gap-4 border-b border-dashed border-neutral-900/15 py-2.5"
              >
                <dt className="w-14 shrink-0 text-neutral-400">{k}</dt>
                <dd className="text-neutral-800">{v}</dd>
              </div>
            ))}
            <div className="story-bio flex gap-4 py-2.5">
              <dt className="w-14 shrink-0 text-neutral-400">STATUS</dt>
              <dd className="flex items-center gap-2 text-neutral-800">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d9ff00] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#b8d900]" />
                </span>
                Open for internships
              </dd>
            </div>
          </dl>
        </div>

        {/* CHAPTER ROWS */}
        <ul>
          {CHAPTERS.map((c, i) => {
            const isActive = active === i;
            return (
              <li
                key={c.n}
                onMouseEnter={() => setActive(i)}
                className={`story-row relative overflow-hidden border-t border-neutral-900/15 transition-colors duration-300 ${
                  isActive ? "bg-neutral-50" : "bg-white"
                }`}
              >
                {/* lime marker on the active row */}
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 w-1 origin-top bg-[#d9ff00] transition-transform duration-300 ${
                    isActive ? "scale-y-100" : "scale-y-0"
                  }`}
                />

                {/* dotted particle accent (md+) */}
                <span
                  aria-hidden
                  className={`pointer-events-none absolute left-[48%] top-0 hidden h-full w-28 text-neutral-900 transition-opacity duration-500 md:block ${
                    isActive ? "opacity-30" : "opacity-0"
                  }`}
                  
                />

                <div className="flex items-start justify-between gap-6 px-6 py-6 md:px-12 md:py-7 lg:px-[120px]">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-expanded={isActive}
                    className="flex flex-1 gap-4 text-left md:gap-6"
                  >
                    <span
                      className={`pt-1 font-rajdhani font-semibold text-sm transition-colors ${
                        isActive ? "text-neutral-950" : "text-neutral-400"
                      }`}
                    >
                      {c.n}.
                    </span>

                    <span className="block">
                      <span className="block font-rajdhani text-xl font-semibold md:text-2xl">
                        {c.title}
                      </span>

                      {/* collapsed on mobile unless active; always open on md+ */}
                      <span
                        className={`grid transition-[grid-template-rows] duration-300 md:grid-rows-[1fr] ${
                          isActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                      >
                        <span className="overflow-hidden">
                          <span className="mt-2 block max-w-xl text-sm text-neutral-500">
                            {c.text}
                          </span>
                        </span>
                      </span>
                    </span>
                  </button>

                  {/* CTA: appears on active row */}
                  <a
                    href={c.cta.href}
                    tabIndex={isActive ? 0 : -1}
                    className={`hidden shrink-0 items-center gap-2 self-center rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-neutral-800 md:inline-flex ${
                      isActive
                        ? "translate-x-0 opacity-100"
                        : "pointer-events-none translate-x-3 opacity-0"
                    }`}
                  >
                    {c.cta.label}
                    <span aria-hidden className="text-[#d9ff00]">»</span>
                  </a>
                </div>
              </li>
            );
          })}
        </ul>

        {/* HATCHED DIVIDER into the projects section */}
        <div
          aria-hidden
          className="h-20 border-t border-neutral-900/15 md:h-28"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, transparent 0 14px, rgba(23,23,23,0.12) 14px 15px)",
          }}
        />
      </div>
    </section>
  );
}