"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const RAMP = ".:-=+*#%@";
const CELL = 14;          // bigger = fewer, more spaced-out characters
const RADIUS = 180;
const DENSITY = 0.35;     // 0 to 1, how many cells in the glow get a character
const FONT = "500 10px ui-monospace, SFMono-Regular, Menlo, monospace";
const BASE_COLOR = "#9aa0a6"; // darker grey so it's visible on light pages
const TINTS = [
    { color: "#646aed", share: 0.01 },
    { color: "#d5fe00", share: 0.02 },
    { color: "#121212", share: 0.1 },
];
const MEDIA =
    "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const SOLID = "img, video, svg, canvas, iframe, input, textarea, select";

const hash = (x, y, z) => {
    const v = Math.sin(127.1 * x + 311.7 * y + 74.7 * z) * 43758.5453;
    return v - Math.floor(v);
};

function overText(x, y) {
    let node = null;
    let offset = 0;

    if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(x, y);
        node = pos?.offsetNode ?? null;
        offset = pos?.offset ?? 0;
    } else if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(x, y);
        node = range?.startContainer ?? null;
        offset = range?.startOffset ?? 0;
    }

    if (!node || node.nodeType !== Node.TEXT_NODE) return false;

    const len = node.textContent?.length ?? 0;
    const range = document.createRange();

    for (const i of [offset - 1, offset]) {
        if (i < 0 || i >= len) continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (
            x >= r.left - 2 && x <= r.right + 2 &&
            y >= r.top - 2 && y <= r.bottom + 2
        ) {
            return true;
        }
    }
    return false;
}

function hasOpaqueBg(el, cache) {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
        let opaque = cache.get(n);
        if (opaque === undefined) {
            const m = getComputedStyle(n).backgroundColor.match(/rgba?\(([^)]+)\)/);
            const alpha = m
                ? Number(m[1].split(/[,/ ]+/).filter(Boolean)[3] ?? 1)
                : 0;
            opaque = alpha > 0.5;
            cache.set(n, opaque);
        }
        if (opaque) return true;
    }
    return false;
}

// respectBackgrounds = false  -> draws everywhere except text/images (easiest, works with any layout)
// respectBackgrounds = true   -> also avoids any element with a solid background colour
export default function AsciiCursor({ respectBackgrounds = false }) {
    const canvasRef = useRef(null);
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const mq = matchMedia(MEDIA);
        const update = () => setEnabled(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!enabled || !canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let dpr = 1;
        const resizeCanvas = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(innerWidth * dpr);
            canvas.height = Math.round(innerHeight * dpr);
        };
        resizeCanvas();

        let mx = -1e4, my = -1e4;
        let hovering = false;
        let intensity = 0;
        let activity = 0;
        let time = 0;
        let lastMove = 0;
        let last = performance.now();
        let raf = 0;

        const cellCache = new Map();
        let generation = 0;
        let bgCache = new WeakMap();
        let cacheStamp = performance.now();
        let deadline = 0;
        let skipRects = [];

        const invalidate = () => {
            generation++;
            bgCache = new WeakMap();
            cacheStamp = performance.now();
        };

        const isEmpty = (cx, cy, vx, vy) => {
            if (vx < 0 || vy < 0 || vx >= innerWidth || vy >= innerHeight) return false;
            if (skipRects.some((r) => vx >= r.left && vx <= r.right && vy >= r.top && vy <= r.bottom)) {
                return false;
            }

            const key = cx * 100003 + cy;
            const hit = cellCache.get(key);
            if (hit?.gen === generation) return hit.value;
            if (performance.now() > deadline) return hit?.value;

            const el = document.elementFromPoint(vx, vy);
            const value =
                !!el &&
                !el.closest(SOLID) &&
                (!respectBackgrounds || !hasOpaqueBg(el, bgCache)) &&
                !overText(vx, vy);

            if (cellCache.size > 60000) cellCache.clear();
            cellCache.set(key, { value, gen: generation });
            return value;
        };

        const frame = (now) => {
            raf = 0;
            const dt = Math.min(Math.max(now - last, 0) / 1000, 0.1);
            last = Math.max(now, last);

            intensity += ((hovering ? 1 : 0) - intensity) * (1 - Math.exp(-dt * (hovering ? 10 : 3)));
            intensity = Math.min(Math.max(intensity, 0), 1);

            const moving = now - lastMove < 120;
            activity += ((moving ? 1 : 0) - activity) * (1 - Math.exp(-dt * (moving ? 20 : 8)));
            time += 12 * dt * activity;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, innerWidth, innerHeight);
            if (intensity < 0.002 && !hovering) return;

            if (performance.now() - cacheStamp > 2000) invalidate();
            deadline = performance.now() + 3;
            skipRects = [...document.querySelectorAll("header, [data-ascii-skip]")].map(
                (e) => e.getBoundingClientRect()
            );

            ctx.font = FONT;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const px = mx + scrollX;
            const py = my + scrollY;
            let pending = false;

            const x0 = Math.floor((px - RADIUS) / CELL);
            const x1 = Math.ceil((px + RADIUS) / CELL);
            const y0 = Math.floor((py - RADIUS) / CELL);
            const y1 = Math.ceil((py + RADIUS) / CELL);

            for (let cx = x0; cx <= x1; cx++) {
                for (let cy = y0; cy <= y1; cy++) {
                    const dx = cx * CELL - px;
                    const dy = cy * CELL - py;
                    const dist = Math.hypot(dx, dy);
                    if (dist >= RADIUS) continue;

                    const empty = isEmpty(cx, cy, cx * CELL - scrollX, cy * CELL - scrollY);
                    if (empty === undefined) pending = true;
                    if (!empty) continue;

                    const u = 1 - dist / RADIUS;
                    const m = u * u * (3 - 2 * u) * intensity;

                    const step = Math.floor(time * (0.5 + hash(cx, cy, 7)) + 10 * hash(cx, cy, 8));
                    let idx = Math.round(m * (RAMP.length - 1));
                    const n = hash(cx, cy, step);

                    if (n < 0.07) idx = Math.floor(hash(cx, cy, step + 0.3) * RAMP.length);
                    else if (n < 0.35) idx += Math.round((hash(cx, cy, step + 0.6) - 0.5) * 4);
                    idx = Math.min(Math.max(idx, 0), RAMP.length - 1);

                    let color = BASE_COLOR;
                    let r = hash(cx, cy, step + 0.9);
                    for (const t of TINTS) {
                        if (r < t.share) { color = t.color; break; }
                        r -= t.share;
                    }

                    ctx.fillStyle = color;
                    ctx.globalAlpha = Math.min(1, 1.4 * m);
                    ctx.fillText(RAMP[idx], cx * CELL - scrollX, cy * CELL - scrollY);
                }
            }
            ctx.globalAlpha = 1;

            const settled = hovering && !pending && activity < 0.01 && intensity > 0.995;
            if (!settled) raf = requestAnimationFrame(frame);
        };

        const kick = () => {
            if (raf) return;
            last = performance.now();
            raf = requestAnimationFrame(frame);
        };

        const onMove = (e) => {
            if (e.pointerType !== "mouse") return;
            mx = e.clientX;
            my = e.clientY;
            lastMove = performance.now();
            hovering = true;
            kick();
        };
        const onOut = (e) => {
            if (!e.relatedTarget) { hovering = false; kick(); }
        };
        const onResize = () => { resizeCanvas(); invalidate(); kick(); };

        let mutationTimer = 0;
        const onMutate = () => {
            clearTimeout(mutationTimer);
            mutationTimer = window.setTimeout(invalidate, 100);
        };
        const observer = new MutationObserver(onMutate);
        observer.observe(document.body, { childList: true, subtree: true });

        window.addEventListener("pointermove", onMove, { passive: true });
        document.addEventListener("mouseout", onOut);
        document.addEventListener("toggle", onMutate, true);
        window.addEventListener("scroll", kick, { passive: true });
        window.addEventListener("resize", onResize);

        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(mutationTimer);
            observer.disconnect();
            window.removeEventListener("pointermove", onMove);
            document.removeEventListener("mouseout", onOut);
            document.removeEventListener("toggle", onMutate, true);
            window.removeEventListener("scroll", kick);
            window.removeEventListener("resize", onResize);
        };
    }, [enabled, respectBackgrounds]);

    if (!enabled) return null;

    // Portal to <body> so no parent (grid, transform, overflow) can trap it
    return createPortal(
        <canvas
            ref={canvasRef}
            aria-hidden
            className="pointer-events-none fixed inset-0 h-full w-full"
            style={{ zIndex: 40 }}
        />,
        document.body
    );
}