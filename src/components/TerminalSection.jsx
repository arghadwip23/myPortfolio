"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const HOST = "arghadwip23@portfolio";
const GLOW = "[text-shadow:0_0_8px_rgba(217,255,0,0.45)]";

/* ---------- CONTENT: edit this ---------- */

// TODO: replace these with your real links
const EMAIL = "arghadwip23@gmail.com";
const GITHUB = "https://github.com/arghadwip23";
const LINKEDIN = "https://www.linkedin.com/in/arghadwip";
const RESUME_URL = "/resume.pdf";

const ART = [
  "        ▄▄▄▄        ",
  "      ▄██████▄      ",
  "     ▐████████▌     ",
  "     ▐████████▌     ",
  "      ▀██████▀      ",
  "        ▐██▌        ",
  "   ▄▄▄▄▄████▄▄▄▄▄   ",
  " ▐████████████████▌ ",
  " ▐████████████████▌ ",
];

const FETCH = [
  ["", HOST],
  ["", "---------------------"],
  ["OS", "B.Tech ECM '28 · VIT Chennai"],
  ["Host", "Coochbehar, West Bengal"],
  ["Shell", "Next.js · Kotlin · C++ · Python"],
  ["Focus", "Full-stack · Android · ML · Systems"],
  ["Club", "SEDS Antariksh (technical team)"],
  ["Status", "● Open for internships"],
];

// t: boot | bar | cmd | out | log | fetch
const SCRIPT = [
  { t: "boot", text: "[ OK ] mounting curiosity.sys" },
  { t: "boot", text: "[ OK ] loading navodaya.dat" },
  { t: "boot", text: "[ OK ] starting engineering.service" },
  { t: "bar", text: "LOADING" },

  { t: "cmd", text: "whoami" },
  { t: "out", text: "arghadwip23" },

  { t: "cmd", text: "neofetch" },
  { t: "fetch" },

  // PLACEHOLDER: replace these with your own moments
  { t: "cmd", text: "cat origin.log" },
  { t: "log", ts: "2010", text: "Coochbehar. First time touching a computer. Didn't know code—just pure wonder." },
  { t: "log", ts: "Class 6", text: "Cleared the Navodaya entrance. A quiet kid suddenly saw a much bigger world." },
  { t: "log", ts: "2024", text: "VIT Chennai, ECM. Went from breaking things to engineering them." },

  { t: "cmd", dir: "~/foundations", text: "ls" },
  { t: "out", text: "vit-chennai/  biomedical-research/  seds-antariksh/" },
  { t: "log", ts: "Dec 2024", text: "Joined the SEDS Antariksh technical team." },
  { t: "log", ts: "2026", text: "Web development internship at VitaData Solutions." },

  { t: "cmd", dir: "~", text: "./projects --launch" },
  { t: "out", text: "→ opening projects ..." },
];

/* ---------- interactive commands ---------- */
// A line is either a string or { text, href }.

const HELP = [
  ["help", "list commands"],
  ["whoami", "who I am"],
  ["skills", "tools I use"],
  ["projects", "what I've built"],
  ["contact", "get in touch"],
  ["resume", "open my resume"],
  ["replay", "run the boot sequence again"],
  ["clear", "clear the screen"],
];

const OUTPUT = {
  help: ["Available commands:", ...HELP.map(([c, d]) => `  ${c.padEnd(10)}${d}`)],
  whoami: [
    "Arghadwip Sarkar",
    "B.Tech ECE '28, VIT Chennai",
    "SEDS Antariksh technical team",
  ],
  skills: [
    "Languages  C++ · Python · Kotlin",
    "Web        Next.js",
    "Focus      Full-stack · Android · ML · Systems",
  ],
  projects: [
    "MalWave    Android malware drift analysis framework",
    "NetGuard   Per-app firewall and traffic monitor for Windows",
    { text: "→ see all projects", href: "#projects" },
  ],
  contact: [
    { text: `email     ${EMAIL}`, href: `mailto:${EMAIL}` },
    { text: "github    open profile", href: GITHUB },
    { text: "linkedin  open profile", href: LINKEDIN },
  ],
  resume: [{ text: "→ open resume.pdf", href: RESUME_URL }],
};

const CHIPS = ["help", "projects", "contact", "replay"];

/* ---------- timeline math ---------- */

const weightOf = (l) =>
  l.t === "cmd" ? l.text.length + 8
  : l.t === "bar" ? 28
  : l.t === "fetch" ? FETCH.length * 3
  : l.t === "log" ? 12
  : l.t === "boot" ? 10
  : 8;

let acc = 0;
const LINES = SCRIPT.map((l) => {
  const w = weightOf(l);
  const line = { ...l, start: acc, w };
  acc += w;
  return line;
});
const TOTAL = acc;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- small pieces ---------- */

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9ff00]";

function Cursor() {
  return <span aria-hidden className="term-cursor" />;
}

function Prompt({ dir = "~" }) {
  return (
    <span className="select-none">
      <span className={`text-[#d9ff00] ${GLOW}`}>{HOST}</span>
      <span className="text-neutral-500">{`:${dir}$ `}</span>
    </span>
  );
}

function Cross({ className = "" }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute hidden h-3 w-3 text-neutral-900/40 md:block ${className}`}
    >
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current" />
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
    </span>
  );
}

function OutLine({ line }) {
  if (typeof line === "string") {
    return (
      <div className="whitespace-pre-wrap break-words text-neutral-300">{line}</div>
    );
  }
  const external = line.href.startsWith("http");
  return (
    <div className="whitespace-pre-wrap break-words">
      <a
        href={line.href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={`text-[#d9ff00] underline underline-offset-2 hover:text-white ${FOCUS_RING}`}
      >
        {line.text}
      </a>
    </div>
  );
}

/* ---------- component ---------- */

export default function TerminalSection() {
  const sectionRef = useRef(null);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const tweenRef = useRef(null);
  const skippedRef = useRef(false);
  const stickRef = useRef(true); // true = auto-follow newest line
  const recallRef = useRef({ list: [], idx: 0 }); // arrow-up/down history

  const [pos, setPos] = useState(0);
  const [history, setHistory] = useState([]); // [{ cmd, out }]
  const [cleared, setCleared] = useState(false);
  const [input, setInput] = useState("");

  // intro: autoplays once when the section scrolls into view (no scroll hijacking)
  useEffect(() => {
    const state = { p: 0 };
    const tween = gsap.to(state, {
      p: TOTAL,
      duration: 16,
      ease: "none",
      paused: true,
      onUpdate: () => setPos(Math.round(state.p)),
    });
    tweenRef.current = tween;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      skippedRef.current = true;
      tween.progress(1);
      setPos(TOTAL);
      return () => tween.kill();
    }

    const begin = () => {
      if (!skippedRef.current) tween.play();
    };
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 70%",
      once: true,
      onEnter: begin,
    });
    if (st.progress > 0) begin(); // page loaded already past the section

    return () => {
      st.kill();
      tween.kill();
    };
  }, []);

  // follow the newest line, unless the user scrolled up to read
  useEffect(() => {
    const el = bodyRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [pos, history, cleared]);

  const onBodyScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };

  const done = pos >= TOTAL;
  const lastIdx = LINES.reduce((a, l, i) => (pos >= l.start ? i : a), 0);

  const skip = () => {
    skippedRef.current = true;
    tweenRef.current?.progress(1);
    setPos(TOTAL);
  };

  const replay = () => {
    skippedRef.current = false;
    stickRef.current = true;
    setHistory([]);
    setCleared(false);
    setInput("");
    setPos(0);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    tweenRef.current?.restart();
  };

  const runCommand = (raw) => {
    const text = raw.trim();
    const cmd = text.toLowerCase();

    stickRef.current = true;
    if (cmd === "replay") return replay();
    if (!done) skip();
    if (cmd === "clear") {
      setHistory([]);
      setCleared(true);
      return;
    }

    const out =
      cmd === ""
        ? []
        : OUTPUT[cmd] ?? [`command not found: ${text}. Type 'help' to list commands.`];
    setHistory((h) => [...h, { cmd: text, out }]);

    if (text) {
      const r = recallRef.current;
      r.list.push(text);
      r.idx = r.list.length;
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const raw = input;
    setInput("");
    runCommand(raw);
  };

  const onInputKeyDown = (e) => {
    const r = recallRef.current;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      r.idx = Math.max(0, r.idx - 1);
      setInput(r.list[r.idx] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      r.idx = Math.min(r.list.length, r.idx + 1);
      setInput(r.list[r.idx] ?? "");
    }
  };

  // Enter skips the intro when the terminal has focus (tab to it or tap it)
  const onBodyKeyDown = (e) => {
    if (!done && e.key === "Enter") {
      e.preventDefault();
      skip();
    }
  };

  const onBodyClick = () => {
    if (done && !window.getSelection()?.toString()) {
      inputRef.current?.focus({ preventScroll: true });
    }
  };

  return (
    <section
      id="origin"
      ref={sectionRef}
      className="relative w-full border-b border-neutral-900/15 bg-white text-neutral-950"
    >
      {/* rails: same offset as HeroGuides */}
      <div className="md:mx-[var(--guide-x)] md:border-x md:border-neutral-900/15">
        <div className="px-6 pb-10 pt-16 md:px-12 md:pt-20 lg:px-[120px]">
          {/* header */}
          <p className="mb-3 font-mono text-xs text-neutral-500">01 / CURIOSITY</p>
          <h2 className="mb-8 font-rajdhani text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl md:mb-10 lg:text-5xl">
            <span className="text-neutral-500">Every build starts with a boot sequence. </span>
            <span>This is mine.</span>
          </h2>

          {/* accessible transcript (the animated lines are aria-hidden) */}
          <p className="sr-only">
            {SCRIPT.filter((l) => l.t === "log" || l.t === "out")
              .map((l) => (l.ts ? `${l.ts}: ${l.text}` : l.text))
              .join(". ")}
          </p>

          {/* terminal window */}
          <div className="relative">
            <Cross className="-left-1.5 -top-1.5" />
            <Cross className="-right-1.5 -top-1.5" />
            <Cross className="-bottom-1.5 -left-1.5" />
            <Cross className="-bottom-1.5 -right-1.5" />

            <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-[#0a0a0a] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)]">
              {/* title bar */}
              <div className="flex items-center justify-between border-b border-white/10 bg-neutral-900 px-4 py-2.5">
                <div aria-hidden className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
                </div>
                <span aria-hidden className="truncate px-2 font-mono text-[11px] text-neutral-500">
                  {HOST}: ~
                </span>
                {!done ? (
                  <button
                    type="button"
                    onClick={skip}
                    className={`rounded px-1 font-mono text-[11px] text-neutral-400 transition hover:text-[#d9ff00] ${FOCUS_RING}`}
                  >
                    skip »
                  </button>
                ) : (
                  <span aria-hidden className="w-8" />
                )}
              </div>

              {/* body (scrollable, focusable) */}
              <div
                ref={bodyRef}
                role="region"
                aria-label={done ? "Terminal" : "Terminal intro. Press Enter to skip."}
                tabIndex={done ? undefined : 0}
                onScroll={onBodyScroll}
                onKeyDown={onBodyKeyDown}
                onClick={onBodyClick}
                className={`h-[min(58svh,520px)] touch-pan-y overflow-y-auto overflow-x-hidden px-4 py-4 font-mono text-[12px] leading-relaxed text-neutral-300 [scrollbar-color:#333_transparent] [scrollbar-width:thin] sm:text-[13px] md:px-6 md:text-sm focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#d9ff00]`}
              >
                {/* animated intro */}
                <div aria-hidden>
                  {!cleared &&
                    LINES.map((l, i) => {
                      const local = pos - l.start;
                      if (local < 0) return null;

                      if (l.t === "boot") {
                        const m = l.text.match(/^\[ (\w+) \] (.*)$/);
                        return (
                          <div key={i} className="whitespace-pre-wrap">
                            <span className={`text-[#d9ff00] ${GLOW}`}>[ {m?.[1]} ]</span>{" "}
                            <span className="text-neutral-400">{m?.[2]}</span>
                          </div>
                        );
                      }

                      if (l.t === "bar") {
                        const pct = clamp(local / l.w, 0, 1);
                        const filled = Math.round(pct * 20);
                        return (
                          <div key={i} className="whitespace-pre text-neutral-400">
                            {l.text}{" "}
                            <span className={`text-[#d9ff00] ${GLOW}`}>
                              [{"█".repeat(filled)}
                              {"░".repeat(20 - filled)}]
                            </span>{" "}
                            {Math.round(pct * 100)}%
                          </div>
                        );
                      }

                      if (l.t === "cmd") {
                        const typed = clamp(Math.floor(local), 0, l.text.length);
                        return (
                          <div key={i} className="mt-3 whitespace-pre-wrap break-words">
                            <Prompt dir={l.dir} />
                            <span className="text-white">{l.text.slice(0, typed)}</span>
                            {!done && i === lastIdx && <Cursor />}
                          </div>
                        );
                      }

                      if (l.t === "out") {
                        return (
                          <div key={i} className="whitespace-pre-wrap break-words text-neutral-300">
                            {l.text}
                          </div>
                        );
                      }

                      if (l.t === "log") {
                        return (
                          <div key={i} className="flex gap-3">
                            <span className="w-20 shrink-0 text-neutral-500">{l.ts}</span>
                            <span className="text-neutral-200">{l.text}</span>
                          </div>
                        );
                      }

                      if (l.t === "fetch") {
                        const shown = Math.min(FETCH.length, Math.floor(local / 3) + 1);
                        return (
                          <div key={i} className="my-3 flex gap-6">
                            <pre
                              className={`hidden shrink-0 leading-[1.15] text-[#d9ff00]/70 sm:block ${GLOW}`}
                            >
                              {ART.join("\n")}
                            </pre>
                            <div className="min-w-0">
                              {FETCH.slice(0, shown).map(([k, v], j) => (
                                <div key={j} className="whitespace-pre-wrap break-words">
                                  {k ? (
                                    <>
                                      <span className={`inline-block w-14 text-[#d9ff00] ${GLOW}`}>
                                        {k}
                                      </span>
                                      <span className="text-neutral-200">{v}</span>
                                    </>
                                  ) : (
                                    <span
                                      className={j === 0 ? `text-[#d9ff00] ${GLOW}` : "text-neutral-600"}
                                    >
                                      {v}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                </div>

                {/* command history (announced to screen readers) */}
                <div role="log" aria-live="polite">
                  {history.map((h, i) => (
                    <div key={i}>
                      <div className="mt-3 whitespace-pre-wrap break-words">
                        <span aria-hidden>
                          <Prompt dir="~" />
                        </span>
                        <span className="text-white">{h.cmd}</span>
                      </div>
                      {h.out.map((line, j) => (
                        <OutLine key={j} line={line} />
                      ))}
                    </div>
                  ))}
                </div>

                {/* live prompt, only once the intro is finished */}
                {done && (
                  <form onSubmit={onSubmit} className="mt-3 flex items-center">
                    <span aria-hidden className="shrink-0 whitespace-pre">
                      <Prompt dir="~" />
                    </span>
                    {/* 16px on phones so iOS doesn't zoom the page when the input is focused */}
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={onInputKeyDown}
                      aria-label="Terminal command. Type help to see what you can run."
                      placeholder="type help"
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="send"
                      className="min-w-0 flex-1 bg-transparent text-[16px] text-white caret-[#d9ff00] outline-none placeholder:text-neutral-600 sm:text-[13px] md:text-sm"
                    />
                  </form>
                )}
              </div>

              {/* scanlines */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 3px)",
                }}
              />
            </div>
          </div>

          {/* hint + tappable commands */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[11px] text-neutral-600">
              {done
                ? "Type a command, or tap one."
                : "Press Enter or tap skip to jump to the end."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => runCommand(c)}
                  className={`min-h-9 rounded-full border border-neutral-900/20 px-3 font-mono text-[12px] text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950 ${FOCUS_RING}`}
                >
                  {c}
                </button>
              ))}
              {done && (
                <a
                  href="#projects"
                  className={`ml-1 font-mono text-[12px] text-neutral-700 transition hover:text-neutral-950 ${FOCUS_RING}`}
                >
                  projects →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* hatched divider into the next section */}
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