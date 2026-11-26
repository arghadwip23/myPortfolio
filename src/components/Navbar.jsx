"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

// =====================================================
// EDIT ME
// =====================================================
const LOGO = { name: "ARGHADWIP", tagline: "P O R T F O L I O", href: "#" };
import ShaderNavButton from "./shaderNavButton";
const LINKS = [
  { label: "Projects", href: "#projects" },
  { label: "Skills", href: "#skills" },
  { label: "Experience", href: "#experience" },
  { label: "Contact", href: "#contact" },
];

const CTA = { label: "Let's talk", href: "#contact" };

// IANA time zones: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
const CLOCKS = {
  left: { label: "Kolkata", timeZone: "Asia/Kolkata" },
  right: { label: "NYC", timeZone: "America/New_York" },
};

const STATUS = {
  available: true,
  text: "Open to opportunities",
  note: "Internships · Freelance",
};

const CTA_GRADIENT =
  "bg-[linear-gradient(110deg,#a9d600_0%,#d2f51c_55%,#b4e000_100%)]";

// =====================================================
// HELPERS
// =====================================================
function formatClock(timeZone, date) {
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  const offset =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")
      ?.value.replace("GMT", "UTC") ?? "";

  return `${time} ${offset === "UTC" ? "UTC+0" : offset}`;
}

function ChevronsIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m7 6 6 6-6 6" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function StatusDot({ available }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${available ? "bg-emerald-500" : "bg-red-500"
          }`}
      />
      <span
        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${available ? "bg-emerald-500" : "bg-red-500"
          }`}
      />
    </span>
  );
}

// =====================================================
// COMPONENT
// =====================================================
export default function Navbar() {
  const navRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const [now, setNow] = useState(null);

  // Live clocks (rendered after mount to avoid hydration mismatch)
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  // Entrance animation
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.from(navRef.current, {
        y: -90,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        delay: 0.2,
      });
    }, navRef);
    return () => ctx.revert();
  }, []);

  // Hide on scroll down, show on scroll up (always visible while menu is open)
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (open) {
      gsap.to(navRef.current, {
        yPercent: 0,
        duration: reduced ? 0 : 0.3,
        overwrite: "auto",
      });
      return;
    }

    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const goingDown = y > lastY && y > 120;
      lastY = y;
      gsap.to(navRef.current, {
        yPercent: goingDown ? -150 : 0,
        duration: reduced ? 0 : 0.5,
        ease: "power3.out",
        overwrite: "auto",
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  // Highlight the link of the section currently in view
  useEffect(() => {
    const els = LINKS.map((l) => document.getElementById(l.href.slice(1))).filter(Boolean);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && setActive(`#${e.target.id}`)),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Close the mobile menu if the viewport grows to desktop size
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => e.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Mobile menu: animate items in, close on Escape
  useEffect(() => {
    if (!open) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".nav-m-item",
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, ease: "power3.out", stagger: 0.05 }
      );
    }, navRef);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      ctx.revert();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const leftClock = now ? formatClock(CLOCKS.left.timeZone, now) : "--:--";
  const rightClock = now ? formatClock(CLOCKS.right.timeZone, now) : "--:--";

  return (
    <header
      ref={navRef}
      className="fixed inset-x-0 top-2 z-50 mx-auto w-[calc(100%-1.5rem)] sm:top-3 sm:w-[calc(100%-3rem)] md:w-[78%] md:max-w-[680px] lg:top-5 lg:w-[60%] lg:max-w-[920px] xl:max-w-[1040px] 2xl:max-w-[1120px]"
    >
      {/* Shell: transparent on mobile when closed, white on desktop / when menu is open */}
      <div
        className={`rounded-[26px] transition-colors duration-300 lg:rounded-[28px] lg:bg-white lg:shadow-[0_24px_60px_-18px_rgba(0,0,0,0.35)] ${open ? "bg-white shadow-[0_20px_50px_-18px_rgba(0,0,0,0.35)]" : "bg-transparent"
          }`}
      >
        {/* DARK BAR */}
        <nav
          aria-label="Main"
          className="flex items-center justify-between gap-4 rounded-full bg-neutral-950 px-4 py-2 text-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.5)] sm:px-5 lg:px-6 lg:py-3 lg:shadow-none"
        >
          {/* Logo */}
          <a
            href={LOGO.href}
            className="flex flex-col leading-none"
            onClick={() => setOpen(false)}
          >
            {/* Logo text */}
            <span className="whitespace-nowrap text-base font-light tracking-[0.12em] sm:text-lg lg:text-lg xl:text-xl">
              {LOGO.name}
            </span>
          </a>

          {/* Desktop links */}
          <ul className="hidden items-center gap-4 lg:flex xl:gap-8">
            {LINKS.map((link) => {
              const isActive = active === link.href;
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={`flex items-center gap-1 whitespace-nowrap text-[15px] font-medium transition-opacity hover:opacity-100 xl:gap-1.5 xl:text-[17px] ${isActive ? "opacity-100" : "opacity-80"
                      }`}
                  >
                    <span
                      className={`h-1 w-1 rounded-full bg-[#c9f21a] transition-opacity ${isActive ? "opacity-100" : "opacity-0"
                        }`}
                    />
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>

          {/* Desktop CTA */}
          {/* Desktop CTA */}
          <ShaderNavButton
            href={CTA.href}
            speed={0.5}
            className="hidden items-center rounded-full px-5 py-2.5 text-sm lg:inline-flex xl:px-7 xl:py-3.5"
          >
            {CTA.label}
            <ChevronsIcon className="transition-transform group-hover:translate-x-0.5" />
          </ShaderNavButton>

          {/* Mobile / tablet toggle */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/15 lg:hidden"
          >
            <span
              className={`absolute h-0.5 w-[18px] rounded bg-white transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-[5px]"
                }`}
            />
            <span
              className={`absolute h-0.5 w-[18px] rounded bg-white transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-[5px]"
                }`}
            />
          </button>
        </nav>

        {/* INFO STRIP (lg and up) */}
        {/* <div className="hidden items-center justify-between px-8 py-3 text-[15px] text-neutral-800 lg:flex">
          <span className="tabular-nums">
            {CLOCKS.left.label} <span className="mx-0.5 text-neutral-400">|</span> {leftClock}
          </span>

          {/* <span className="flex items-center gap-2.5">
            <StatusDot available={STATUS.available} />
            {STATUS.text}
            <span className="text-neutral-500">· {STATUS.note}</span>
          </span> *

          <span className="tabular-nums">
            {CLOCKS.right.label} <span className="mx-0.5 text-neutral-400">|</span> {rightClock}
          </span>
        </div> */}

        {/* MOBILE / TABLET MENU */}
        {open && (
          <div className="px-4 pb-4 pt-2 sm:px-5 lg:hidden">
            <ul className="flex flex-col">
              {LINKS.map((link) => (
                <li
                  key={link.href}
                  className="nav-m-item border-b border-neutral-100 last:border-0"
                >
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-3 text-base font-medium text-neutral-950"
                  >
                    {link.label}
                    <ChevronsIcon className="text-neutral-400" />
                  </a>
                </li>
              ))}
            </ul>

            <a
              href={CTA.href}
              onClick={() => setOpen(false)}
              className={`nav-m-item mt-3 flex items-center justify-center gap-2 rounded-full ${CTA_GRADIENT} px-5 py-3 text-sm font-semibold text-neutral-950`}
            >
              {CTA.label}
              <ChevronsIcon />
            </a>

            <div className="nav-m-item mt-4 flex justify-between text-xs tabular-nums text-neutral-500">
              <span>
                {CLOCKS.left.label} | {leftClock}
              </span>
              <span>
                {CLOCKS.right.label} | {rightClock}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}