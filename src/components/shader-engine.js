// Your existing lime scheme (4 stops, cyclic)
export const DEFAULT_PALETTE = ["#d4ff1f", "#b8f000", "#1f1f1f"];

const TAU = 0.35; // seconds: how quickly the pause/resume eases

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;
uniform float u_phase;
uniform float u_speed;
uniform float u_glitch;
uniform float u_grain;
uniform vec2 u_res; 
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// x,y in 0..1 (x may be offset by glitch), n = static per-pixel noise
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
vec3 field(vec2 uv, float w, float n) {
  float aspect = u_res.x / u_res.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  // organic wobble: noise sampled on a bounded loop, so it never drifts to huge values
  float warp = (vnoise(p * 2.2 + vec2(sin(w), cos(w * 0.8)) * 1.2) - 0.5) * 0.6;

  // diagonal coordinate the blob travels along
  float s = p.x + p.y * 0.45 + warp;

  // blob center sweeps right <-> left, and its width breathes
  float c = sin(w) * aspect * 0.42;
  float width = 0.8 + 0.25 * sin(w * 1.7 + 1.0);

  // 1 in the core, 0 outside, soft edge
  float d = 1.0 - smoothstep(width * 0.25, width, abs(s - c));

  // lime side: gentle glow variation + fine speckle
  float glow = smoothstep(0.0, 1.0, (1.0 - uv.y) * 0.6 + (1.0 - uv.x) * 0.4);
  vec3 lime = mix(u_c1, u_c0, glow);
  float n2 = hash(floor(gl_FragCoord.xy) + 31.7);
  lime += (n2 - 0.5) * 0.10 * u_grain;                       // grain
  lime += 0.16 * step(0.94, n2) * (1.0 - d) * u_grain;       // bright speckle

  // dithered edge: strongest where the blob fades out
  float mid = clamp(4.0 * d * (1.0 - d) * 1.4, 0.0, 1.0);
  float dd = mix(d, step(n, d), mid * u_grain);

  return mix(lime, u_c2, dd);
}

void main() {
  vec2 uv = v_uv;
  float burst = 0.0;
  float rh = 0.0;
  float split = 0.0;

  if (u_glitch > 0.0) {
    float tick = mod(floor(u_phase * 10.0), 997.0);
    burst = step(0.93, hash(vec2(tick, 3.7))) * u_glitch;
    float rows = 5.0 + floor(hash(vec2(tick, 1.3)) * 9.0);
    float row = floor(uv.y * rows);
    rh = hash(vec2(row, tick));
    float slice = step(0.5, rh) * burst;
    uv.x += (hash(vec2(row, tick + 9.0)) - 0.5) * 0.4 * slice;
    split = 0.03 * burst;
  }

  // one full back-and-forth per cycle; hover freezes it because phase stops accumulating
  float w = u_phase * u_speed * 6.2831853;

  float n = hash(floor(gl_FragCoord.xy));

  vec3 col = vec3(
    field(vec2(uv.x - split, uv.y), w, n).r,
    field(uv, w, n).g,
    field(vec2(uv.x + split, uv.y), w, n).b
  );
  col = mix(col, vec3(1.0), 0.25 * step(0.85, rh) * burst);
  col *= 1.0 - 0.08 * burst * step(0.5, fract(gl_FragCoord.y * 0.5));
  gl_FragColor = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------------------
// Shared singleton: one GL context + one rAF loop for every button
// ---------------------------------------------------------------------------
const insts = new Set();
let status = "idle"; // "idle" | "ready" | "failed"
let glCanvas = null;
let gl = null;
let program = null;
let buffer = null;
let locs = {};
let raf = 0;
let last = 0;

const UNIFORMS = ["u_phase", "u_speed", "u_glitch", "u_grain", "u_res", "u_c0", "u_c1", "u_c2"];

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(g, type, src) {
  const s = g.createShader(type);
  if (!s) throw new Error("createShader failed");
  g.shaderSource(s, src);
  g.compileShader(s);
  if (!g.getShaderParameter(s, g.COMPILE_STATUS)) {
    const log = g.getShaderInfoLog(s);
    g.deleteShader(s);
    throw new Error(log || "shader compile failed");
  }
  return s;
}

function onContextLost(e) {
  e.preventDefault();
  fail();
}

function init() {
  if (status === "ready") return true;
  if (status === "failed") return false;
  try {
    glCanvas = document.createElement("canvas");
    glCanvas.width = glCanvas.height = 1;
    gl = glCanvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) throw new Error("WebGL unavailable");

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    program = gl.createProgram();
    if (!program) throw new Error("createProgram failed");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link failed");
    gl.useProgram(program);

    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const a = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);

    locs = {};
    UNIFORMS.forEach((n) => {
      locs[n] = gl.getUniformLocation(program, n);
    });

    glCanvas.addEventListener("webglcontextlost", onContextLost);
    status = "ready";
    return true;
  } catch {
    fail();
    return false;
  }
}

function teardown() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  if (glCanvas) glCanvas.removeEventListener("webglcontextlost", onContextLost);
  if (gl) {
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    const ext = gl.getExtension("WEBGL_lose_context");
    if (ext) ext.loseContext();
  }
  glCanvas = null;
  gl = null;
  program = null;
  buffer = null;
  locs = {};
}

function fail() {
  status = "failed";
  teardown();
  insts.forEach((i) => i.onFallback());
}

function draw(i) {
  if (!gl || !glCanvas || !i.w || !i.h) return;
  if (glCanvas.width < i.w || glCanvas.height < i.h) {
    glCanvas.width = Math.max(glCanvas.width, i.w); // grow-only: avoids realloc thrash
    glCanvas.height = Math.max(glCanvas.height, i.h);
  }
 // gl.viewport(0, 0, i.w, i.h);
  gl.viewport(0, 0, i.w, i.h);
  gl.uniform2f(locs.u_res, i.w, i.h);
   const [c0, c1, c2] = i.opts.colors.map(hexToRgb);
  gl.uniform1f(locs.u_phase, i.phase);
  gl.uniform1f(locs.u_speed, i.opts.speed);
  gl.uniform1f(locs.u_glitch, i.animated ? i.opts.glitch : 0);
  gl.uniform1f(locs.u_grain, i.opts.grain);
  gl.uniform3f(locs.u_c0, c0[0], c0[1], c0[2]);
  gl.uniform3f(locs.u_c1, c1[0], c1[1], c1[2]);
  gl.uniform3f(locs.u_c2, c2[0], c2[1], c2[2]);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // GL origin is bottom-left; the viewport sits at the bottom of the buffer
  i.ctx.drawImage(glCanvas, 0, glCanvas.height - i.h, i.w, i.h, 0, 0, i.w, i.h);
}

function tick(now) {
  raf = 0;
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  let keep = false;

  insts.forEach((i) => {
    if (!i.animated || !i.w || !i.h) return;
    i.motion += (i.target - i.motion) * (1 - Math.exp(-dt / TAU));
    if (Math.abs(i.target - i.motion) < 0.002) i.motion = i.target;
    i.phase += dt * i.motion;
    if (i.motion > 0) keep = true;
    draw(i);
  });

  if (keep && status === "ready") raf = requestAnimationFrame(tick);
}

function wake() {
  if (raf || status !== "ready") return;
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

function retarget(i) {
  i.target = i.animated && !i.hovered ? 1 : 0;
  if (!i.animated) i.motion = 0;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ colors: string[], speed: number, glitch: number }} opts
 * @param {() => void} onFallback
 * @returns {{ setHover, setAnimated, update, resize, dispose } | null}
 */
export function createShaderButton(canvas, opts, onFallback) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !init()) return null;

  const inst = {
    canvas,
    ctx,
    opts: { ...opts },
    w: 0,
    h: 0,
    motion: 1,
    target: 1,
    phase: Math.random() * 10, // de-sync multiple buttons
    animated: true,
    hovered: false,
    onFallback,
  };
  insts.add(inst);

  return {
    setHover(hovered) {
      inst.hovered = hovered;
      retarget(inst);
      wake();
    },
    setAnimated(animated) {
      inst.animated = animated;
      retarget(inst);
      draw(inst);
      wake();
    },
    update(next) {
      inst.opts = { ...inst.opts, ...next };
      draw(inst);
    },
    resize(w, h) {
      if (w === inst.w && h === inst.h) return;
      inst.w = w;
      inst.h = h;
      canvas.width = w; // resizing clears the canvas, so redraw immediately
      canvas.height = h;
      draw(inst);
      wake();
    },
    dispose() {
      insts.delete(inst);
      if (insts.size === 0) {
        teardown();
        if (status === "ready") status = "idle";
      }
    },
  };
}