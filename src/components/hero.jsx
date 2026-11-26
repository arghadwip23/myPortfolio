"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";

// npm i three gsap
// Put the model at: public/assets/silhouette.bin
const MODEL_URL = "/assets/silhouette.bin";

// =====================================================
// HERO TEXT (edit freely)
// =====================================================
const CONTENT = {
  eyebrow: "Portfolio",
  title: "Hi, I'm Arghadwip.",
  subtitle:
    "Full-stack developer building fast, thoughtful products for the web, Android and ML.",
  primary: { label: "View projects", href: "#projects" },
  secondary: { label: "Get in touch", href: "#contact" },
};

// =====================================================
// 3D CONFIG (RAW model space - do not re-center / re-scale the mesh)
// =====================================================
const CONFIG = {
  // Framing
  fov: 28,
  frameHalfH: 0.325,
  target: [0.06, 0.667],
  fitAspect: 658 / 911, // narrower containers zoom out so the bust is never cropped

  // Head / body motion
  baseYaw: -0.7,
  headMaxYaw: 0.85,
  lookYaw: 1.0,
  lookPitch: 0.5,
  bodyFollow: 0.22,
  headSpeed: 3.2,
  idleAfter: 2.8,
  neckLo: 0.56,
  neckHi: 0.76,
  pivot: [0.0, 0.66, 0.012],

  // Particles
  particles: 79200,
  cornerAim: [1, 1],
  dustAngle: 0,
  dustFan: 28,
  dustBirthEdge: 0.3,
  dustZones: [0.68, 0.2, 0.12],
  shoulderShare: 0.1,
  shoulderFlakes: 0.06,
  leftDust: 7000,
  leftAngle: 165,
  leftFan: 50,
  leftReach: 0.55,
  leftY: [0.38, 0.62],
  leftFlakes: 0.04,
  faceShare: 0.22,
  faceY: [0.72, 0.93],
  flakes: 1328,
  pecFlakes: 700,
  pecBox: [0.04, 0.26, 0.4, 0.62],
  lime: [0.82, 0.82, 0.24],
  limeShare: 0.02,
  mouseRepel: 1,
  particleSize: 1.1,
  dustReach: 0.45,
  dustFade: 0.65,
  flakeShare: 0.00455,
  flakeSpeed: 0.585,
  flakeTravel: 1.8,
  flakeGap: 0.016,

  // Surface shading
  keyDir: [0.75, 0.35, -0.55],
  key: 1,
  fillDir: [-0.85, 0.25, 0.45],
  fill: 0.45,
  frontDir: [-0.7, 0.62, 0.35],
  front: 0.85,
  frontGrain: 1.15,
  topDir: [0.1, 1, 0.15],
  top: 0.8,
  lightAlpha: 0.55,
  rimAlpha: 0.85,
  spec: 0.05,
  grainPx: 3.4,
  ridge: 1.25,
  chestGrain: 0.45,
  tone: 0.04,
  shade: 1.5,
};

// =====================================================
// SIL1 PARSER
// =====================================================
function parseMesh(buffer) {
  if (buffer.byteLength < 36) throw new Error("SIL1 file is too small.");
  const view = new DataView(buffer);
  const magic = new TextDecoder().decode(new Uint8Array(buffer, 0, 4));
  if (magic !== "SIL1") throw new Error(`Invalid mesh format: ${magic}`);

  const vCount = view.getUint32(4, true);
  const iCount = view.getUint32(8, true);
  const min = [12, 16, 20].map((o) => view.getFloat32(o, true));
  const max = [24, 28, 32].map((o) => view.getFloat32(o, true));

  let o = 36;
  const q = new Uint16Array(buffer.slice(o, o + 6 * vCount));
  o += 6 * vCount;
  const nrm = new Int8Array(buffer.slice(o, o + 3 * vCount));
  o += 3 * vCount;
  const crv = new Int8Array(buffer.slice(o, o + vCount));
  o += vCount;
  if (o % 2) o++;
  const idx = new Uint16Array(buffer.slice(o, o + 2 * iCount));

  const pos = new Float32Array(3 * vCount);
  for (let i = 0; i < pos.length; i++) {
    const a = i % 3;
    pos[i] = min[a] + (q[i] / 65535) * (max[a] - min[a]);
  }
  return { pos, nrm, crv, idx };
}

// =====================================================
// SHADERS
// =====================================================
const HEAD_GLSL = `#define CFG_NECK_LO ${CONFIG.neckLo.toFixed(3)}
#define CFG_NECK_HI ${CONFIG.neckHi.toFixed(3)}
uniform float uYaw;
uniform float uPitch;
const vec3 PIVOT = vec3(${CONFIG.pivot.map((n) => n.toFixed(4)).join(", ")});
vec3 rotY(vec3 v, float a){ float c=cos(a), s=sin(a); return vec3(c*v.x + s*v.z, v.y, -s*v.x + c*v.z); }
vec3 rotX(vec3 v, float a){ float c=cos(a), s=sin(a); return vec3(v.x, c*v.y - s*v.z, s*v.y + c*v.z); }
float headW(vec3 p){
  float wy = smoothstep(CFG_NECK_LO, CFG_NECK_HI, p.y);
  float wx = mix(1.0 - smoothstep(0.05, 0.11, abs(p.x)), 1.0, smoothstep(0.69, 0.74, p.y));
  return wy * wx;
}
vec3 headDeform(vec3 p, float w){ vec3 q = p - PIVOT; q = rotY(rotX(q, uPitch * w), uYaw * w); return PIVOT + q; }
vec3 headNormal(vec3 n, float w){ return rotY(rotX(n, uPitch * w), uYaw * w); }`;

const BODY_VERT =
  HEAD_GLSL +
  `
attribute float aCrv;
varying vec3 vN; varying vec3 vObj; varying vec3 vView; varying float vCrv;
void main(){
  vCrv = aCrv;
  float w = headW(position);
  vec3 p = headDeform(position, w);
  vObj = position;
  vN = normalize(normalMatrix * normalize(headNormal(normal, w)));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const BODY_FRAG = `
uniform float uTime; uniform vec3 uLime; uniform float uCellFreq;
uniform vec3 uKeyDir, uFillDir, uTopDir; uniform float uKey, uFill, uTop, uSpec, uTone, uShade;
uniform vec3 uFrontDir; uniform float uFront, uRidge, uChest, uLightA, uFrontGrain, uRimA;
varying vec3 vN; varying vec3 vObj; varying vec3 vView; varying float vCrv;
float hash(vec3 p){ p = fract(p*0.3183099 + vec3(0.1,0.2,0.3)); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec3(1,0,0)), c=hash(i+vec3(0,1,0)), d=hash(i+vec3(1,1,0));
  float e=hash(i+vec3(0,0,1)), g=hash(i+vec3(1,0,1)), h=hash(i+vec3(0,1,1)), k=hash(i+vec3(1,1,1));
  return mix(mix(mix(a,b,f.x), mix(c,d,f.x), f.y), mix(mix(e,g,f.x), mix(h,k,f.x), f.y), f.z);
}
void main(){
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N; vec3 V = normalize(vView);
  float fres = 1.0 - max(dot(N, V), 0.0);
  float y = vObj.y;
  vec3 cp = vObj * uCellFreq;
  cp += 2.2 * (vec3(vnoise(cp * 0.23), vnoise(cp * 0.23 + 17.0), vnoise(cp * 0.23 + 43.0)) - 0.5);
  vec3 cell = floor(cp);
  float h1 = hash(cell);
  float h2 = hash(cell + vec3(17.0, 3.0, 9.0));
  float h3 = hash(cell + vec3(5.0, 31.0, 2.0));
  float dc = length(fract(cp) - (vec3(h1, h3, h2) * 0.5 + 0.25));
  float key  = smoothstep(-0.20, 0.65, dot(N, uKeyDir)) * uKey;
  float fill = smoothstep(0.25, 1.0, dot(N, uFillDir)) * uFill;
  float top  = smoothstep(0.45, 1.0, dot(N, uTopDir)) * uTop;
  float front = pow(smoothstep(0.25, 1.0, dot(N, uFrontDir)), 1.4) * uFront;
  float ridge = smoothstep(0.24, 0.60, vCrv) * clamp(0.05 + front + 0.6 * key + 0.5 * top + 0.4 * fill, 0.0, 1.2) * uRidge;
  float spec = pow(max(dot(reflect(-V, N), uKeyDir), 0.0), 18.0) * uSpec;
  float edge = pow(fres, 2.0);
  float wk = 0.5 + 0.5 * dot(N, uKeyDir), wf = 0.5 + 0.5 * dot(N, uFillDir), wt = 0.5 + 0.5 * dot(N, uTopDir);
  float wr = 0.5 + 0.5 * dot(N, uFrontDir);
  vec3 col = vec3(uTone) + uShade * (0.060 * wk * wk * uKey + 0.040 * wf * wf * uFill + 0.045 * wt * wt * uTop + 0.010 * wr * wr * wr * uFront);
  col += uShade * (0.030 * key + 0.012 * top);
  col += 0.050 * vnoise(cp * 0.25) * (0.15 + key);
  col += vec3(0.90, 0.90, 0.78) * spec;
  float bodyF = mix(uChest, 1.0, smoothstep(0.60, 0.74, y));
  float dens = (1.05 * key + 0.15 * fill + 0.75 * top + uFrontGrain * front) * bodyF + 0.20 * edge * (0.3 + key) + 1.60 * ridge;
  float gl = clamp(key + 0.85 * top + 0.45 * fill + 0.50 * front + ridge, 0.0, 1.0);
  float tw = 0.80 + 0.20 * sin(uTime * 2.2 + h3 * 40.0);
  float g = pow(clamp(dens, 0.0, 1.0), 0.75);
  if (h2 < g * 1.25 && dc < 0.18 + 0.30 * g) {
    float b = (0.50 + 0.50 * h1) * tw * (0.22 + 0.88 * gl);
    bool lime = h3 > 1.0 - 0.85 * pow(key, 1.5);
    vec3 sc = lime ? uLime : vec3(0.55 + 0.20 * min(ridge, 1.0));
    float la = lime ? uRimA : mix(uLightA, uRimA, 0.5 * key);
    col = mix(col, sc * b, 0.94 * la);
  }
  col += (uLime * pow(fres, 2.6) * key * 0.10 + vec3(0.70) * pow(fres, 3.0) * 0.08) * uLightA;
  gl_FragColor = vec4(col, 1.0);
}`;

const PARTICLE_VERT =
  HEAD_GLSL +
  `
attribute vec3 aDir; attribute vec4 aSeed; attribute float aSize;
uniform float uTime, uScale, uSpeed, uSpread, uMouseOn, uAlphaMul; uniform vec2 uCorner; uniform float uFanR;
uniform vec2 uMouse; uniform vec3 uLime; uniform float uLimeShare; uniform float uRepel; uniform float uFlakes; uniform float uAllFlakes;
uniform float uFlakeShare, uFlakeSpeed, uFlakeTravel, uReach, uFadeEnd;
varying float vAlpha; varying vec3 vCol; varying float vShape;
void main(){
  bool flake = uFlakes > 0.5 && (uAllFlakes > 0.5 || aSeed.w < uFlakeShare);
  float rate = (0.05 + 0.10 * aSeed.y) * (flake ? uFlakeSpeed : 1.0);
  float t = fract(uTime * rate * uSpeed + aSeed.x);
  vec3 p0 = headDeform(position, headW(position));
  float dist = pow(t, 1.6) * (0.12 + 0.50 * aSeed.y) * uSpread * uReach * (flake ? uFlakeTravel : 1.0);
  vec4 mv = modelViewMatrix * vec4(p0, 1.0);
  vec2 toC = uCorner * (-mv.z) - mv.xy;
  float a0 = atan(toC.y, toC.x) + (aSeed.z - 0.5) * uFanR;
  mv.xy += vec2(cos(a0), sin(a0)) * length(aDir) * dist;
  mv.z += aDir.z * dist;
  mv.xyz += vec3(sin(t*7.0 + aSeed.z*40.0), cos(t*6.0 + aSeed.w*40.0), sin(t*5.0 + aSeed.x*30.0)) * 0.008 * t * uSpread * uReach;
  vec2 dm = mv.xy - uMouse; float r = length(dm);
  mv.xy += normalize(dm + vec2(1e-5)) * 0.075 * exp(-r*r/0.012) * uMouseOn * uRepel;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(aSize * uScale / (-mv.z), 1.0);
  float fade = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(uFadeEnd * 0.35, uFadeEnd, t));
  bool isLime = !flake && (aSeed.w > (1.0 - uLimeShare));
  vec3 fcol = aSeed.z < 0.45 ? uLime : (aSeed.z < 0.75 ? vec3(0.84) : vec3(0.07));
  vec3 dark = mix(vec3(0.04), vec3(0.34), aSeed.z * aSeed.z);
  vCol = flake ? fcol : (isLime ? uLime : dark);
  vShape = flake ? 1.0 : 0.0;
  vAlpha = fade * uAlphaMul * (isLime ? 0.95 : (flake ? (0.50 + 0.50 * aSeed.y) : (0.60 + 0.40 * aSeed.z)));
}`;

const PARTICLE_FRAG = `
varying float vAlpha; varying vec3 vCol; varying float vShape;
void main(){
  float r = length(gl_PointCoord - 0.5);
  float a = vShape > 0.5 ? 1.0 : smoothstep(0.5, 0.30, r);
  if (a < 0.01) discard;
  gl_FragColor = vec4(vCol, a * vAlpha);
}`;

// =====================================================
// SCENE FACTORY - renders into `host`, returns { dispose }
// =====================================================
function createSilhouette(host, { onReady } = {}) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const density = window.matchMedia("(max-width: 700px)").matches ? 0.45 : 1;

  const renderer = new THREE.WebGLRenderer({
    antialias: density === 1,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0); // transparent: the section background shows through
  const canvas = renderer.domElement;
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;opacity:0;";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CONFIG.fov, 1, 0.05, 10);
  const camTarget = new THREE.Vector3(CONFIG.target[0], CONFIG.target[1], 0);
  const root = new THREE.Group(); // carries body yaw
  scene.add(root);

  const limeVec = new THREE.Vector3(...CONFIG.lime);
  const norm3 = (a) => new THREE.Vector3(a[0], a[1], a[2]).normalize();

  const U = {
    uTime: { value: 0 },
    uYaw: { value: 0 },
    uPitch: { value: 0 },
    uScale: { value: 1000 },
    uMouse: { value: new THREE.Vector2(9, 9) },
    uMouseOn: { value: 0 },
    uCellFreq: { value: 800 },
    uCorner: { value: new THREE.Vector2(0.5, 0.25) },
    uFanR: { value: (CONFIG.dustFan * Math.PI) / 180 },
  };

  let viewHalfH = CONFIG.frameHalfH;
  let viewHalfW = CONFIG.frameHalfH;
  let disposed = false;
  let ready = false;
  let visible = true;
  let rafId = 0;

  // ---------- responsive sizing ----------
  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, density < 1 ? 1.5 : 2);

    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);

    const aspect = w / h;
    camera.aspect = aspect;

    const u = Math.tan(THREE.MathUtils.degToRad(CONFIG.fov / 2));
    let halfH = CONFIG.frameHalfH;
    if (aspect < CONFIG.fitAspect) halfH = CONFIG.frameHalfH * (CONFIG.fitAspect / aspect);
    const dist = halfH / u;

    camTarget.x = CONFIG.target[0];
    camera.position.set(camTarget.x, camTarget.y, dist);
    camera.lookAt(camTarget);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    viewHalfH = halfH;
    viewHalfW = halfH * aspect;

    U.uScale.value = (h * dpr) / (2 * u);
    U.uCellFreq.value = U.uScale.value / dist / CONFIG.grainPx;
    U.uCorner.value.set(u * aspect * CONFIG.cornerAim[0], u * CONFIG.cornerAim[1]);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const visibilityObserver = new IntersectionObserver(
    ([entry]) => (visible = entry.isIntersecting),
    { threshold: 0 }
  );
  visibilityObserver.observe(canvas);

  // ---------- materials ----------
  function createBodyMaterial() {
    return new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        uTime: U.uTime,
        uYaw: U.uYaw,
        uPitch: U.uPitch,
        uCellFreq: U.uCellFreq,
        uLime: { value: limeVec },
        uKeyDir: { value: norm3(CONFIG.keyDir) },
        uKey: { value: CONFIG.key },
        uFillDir: { value: norm3(CONFIG.fillDir) },
        uFill: { value: CONFIG.fill },
        uTopDir: { value: norm3(CONFIG.topDir) },
        uTop: { value: CONFIG.top },
        uSpec: { value: CONFIG.spec },
        uTone: { value: CONFIG.tone },
        uShade: { value: CONFIG.shade },
        uFrontDir: { value: norm3(CONFIG.frontDir) },
        uFront: { value: CONFIG.front },
        uRidge: { value: CONFIG.ridge },
        uFrontGrain: { value: CONFIG.frontGrain },
        uChest: { value: CONFIG.chestGrain },
        uLightA: { value: CONFIG.lightAlpha },
        uRimA: { value: CONFIG.rimAlpha },
      },
      vertexShader: BODY_VERT,
      fragmentShader: BODY_FRAG,
    });
  }

  function buildField(count, spawn, opts) {
    const n = Math.round(count * density);
    const pos = new Float32Array(3 * n);
    const dir = new Float32Array(3 * n);
    const seed = new Float32Array(4 * n);
    const size = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      spawn(i, pos, dir, seed, size);
      size[i] *= CONFIG.particleSize;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aDir", new THREE.BufferAttribute(dir, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: U.uTime,
        uYaw: U.uYaw,
        uPitch: U.uPitch,
        uScale: U.uScale,
        uMouse: U.uMouse,
        uMouseOn: U.uMouseOn,
        uCorner: U.uCorner,
        uFanR: U.uFanR,
        uSpeed: { value: reduced ? 0.3 : 1 },
        uSpread: { value: 1 },
        uAlphaMul: { value: 1 },
        uRepel: { value: opts.repel },
        uFlakes: { value: opts.flakes ?? 0 },
        uAllFlakes: { value: opts.allFlakes ?? 0 },
        uFlakeShare: { value: CONFIG.flakeShare },
        uFlakeSpeed: { value: CONFIG.flakeSpeed },
        uFlakeTravel: { value: CONFIG.flakeTravel },
        uReach: { value: CONFIG.dustReach },
        uFadeEnd: { value: CONFIG.dustFade },
        uLime: { value: limeVec },
        uLimeShare: { value: opts.limeShare },
      },
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 2;
    root.add(points);
  }

  // ---------- build scene from mesh ----------
  function buildScene(mesh) {
    const { pos: P, nrm: M, crv, idx } = mesh;
    const vCount = P.length / 3;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(P, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(M, 3, true));
    geo.setAttribute("aCrv", new THREE.BufferAttribute(crv, 1, true));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const body = new THREE.Mesh(geo, createBodyMaterial());
    body.frustumCulled = false;
    root.add(body);

    // area-weighted vertex sampling
    const cum = new Float32Array(vCount);
    {
      const area = new Float32Array(vCount);
      for (let i = 0; i < idx.length; i += 3) {
        const a = 3 * idx[i], b = 3 * idx[i + 1], c = 3 * idx[i + 2];
        const abx = P[b] - P[a], aby = P[b + 1] - P[a + 1], abz = P[b + 2] - P[a + 2];
        const acx = P[c] - P[a], acy = P[c + 1] - P[a + 1], acz = P[c + 2] - P[a + 2];
        const cx = aby * acz - abz * acy;
        const cy = abz * acx - abx * acz;
        const cz = abx * acy - aby * acx;
        const h = Math.sqrt(cx * cx + cy * cy + cz * cz) / 6;
        area[idx[i]] += h;
        area[idx[i + 1]] += h;
        area[idx[i + 2]] += h;
      }
      let run = 0;
      for (let i = 0; i < vCount; i++) cum[i] = run += area[i];
    }
    const total = cum[vCount - 1];
    const pickVertex = () => {
      const t = Math.random() * total;
      let lo = 0, hi = vCount - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] < t) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };

    const cy = Math.cos(CONFIG.baseYaw);
    const sy = Math.sin(CONFIG.baseYaw);
    const facing = (v, thr) => (cy * M[3 * v]) / 127 + (sy * M[3 * v + 2]) / 127 > thr;

    const setPos = (out, i, v, snap = 0) => {
      for (let k = 0; k < 3; k++) {
        const val = P[3 * v + k];
        out[3 * i + k] = snap ? Math.round(val / snap) * snap : val;
      }
    };
    const setDir = (out, i, angleDeg, fanDeg, r) => {
      const a = ((angleDeg + (Math.random() - 0.5) * fanDeg) * Math.PI) / 180;
      out[3 * i] = Math.cos(a) * r;
      out[3 * i + 1] = Math.sin(a) * r;
      out[3 * i + 2] = (Math.random() - 0.5) * 0.25 * r;
    };
    const setSeed = (out, i, w) => {
      out[4 * i] = Math.random();
      out[4 * i + 1] = Math.random();
      out[4 * i + 2] = Math.random();
      out[4 * i + 3] = w;
    };
    const sizeFor = (w) =>
      w < CONFIG.flakeShare
        ? 9e-4 + 0.0012 * Math.random()
        : 5e-4 + 0.0011 * Math.pow(Math.random(), 2);

    // 1) main dust
    buildField(
      CONFIG.particles,
      (i, pos, dir, seed, size) => {
        const roll = Math.random();
        const z = CONFIG.dustZones;
        const shoulder = Math.random() < CONFIG.shoulderShare;
        let v = 0, tries = 0;

        if (shoulder) {
          do {
            v = pickVertex();
            tries++;
          } while (
            (P[3 * v + 1] < 0.54 ||
              P[3 * v + 1] > 0.67 ||
              Math.abs(P[3 * v]) < 0.08 ||
              M[3 * v + 1] < 50) &&
            tries < 600
          );
        } else {
          const lo = roll < z[0] ? 0.3 : roll < z[0] + z[1] ? 0.6 : 0.76;
          const hi = roll < z[0] ? 0.66 : roll < z[0] + z[1] ? 0.78 : 0.97;
          do {
            v = pickVertex();
            tries++;
          } while (
            (P[3 * v + 1] < lo || P[3 * v + 1] > hi || !facing(v, CONFIG.dustBirthEdge)) &&
            tries < 400
          );
        }

        setPos(pos, i, v);
        setDir(dir, i, CONFIG.dustAngle, CONFIG.dustFan, 0.6 + 0.8 * Math.random());
        let w = Math.random();
        if (shoulder && Math.random() < CONFIG.shoulderFlakes)
          w = Math.random() * CONFIG.flakeShare * 0.99;
        setSeed(seed, i, w);
        size[i] = sizeFor(w);
      },
      { repel: CONFIG.mouseRepel, limeShare: CONFIG.limeShare }
    );

    // 2) left / face dust
    buildField(
      CONFIG.leftDust,
      (i, pos, dir, seed, size) => {
        const range = Math.random() < CONFIG.faceShare ? CONFIG.faceY : CONFIG.leftY;
        let v = 0, tries = 0;
        do {
          v = pickVertex();
          tries++;
        } while (
          (P[3 * v + 1] < range[0] || P[3 * v + 1] > range[1] || facing(v, -0.35)) &&
          tries < 600
        );
        setPos(pos, i, v);
        setDir(dir, i, CONFIG.leftAngle, CONFIG.leftFan, (0.6 + 0.8 * Math.random()) * CONFIG.leftReach);
        let w = Math.random();
        if (Math.random() < CONFIG.leftFlakes) w = Math.random() * CONFIG.flakeShare * 0.99;
        setSeed(seed, i, w);
        size[i] = sizeFor(w);
      },
      { repel: CONFIG.mouseRepel, limeShare: 0 }
    );

    // 3) square flakes
    const used = new Set();
    const key = (v, g) =>
      `${Math.round(P[3 * v] / g)},${Math.round(P[3 * v + 1] / g)},${Math.round(P[3 * v + 2] / g)}`;

    buildField(
      CONFIG.flakes,
      (i, pos, dir, seed, size) => {
        let v = 0, tries = 0, k = "";
        for (;;) {
          v = pickVertex();
          const x = P[3 * v], y = P[3 * v + 1];
          const r = 0.35 + 0.65 * Math.min(Math.max((x + 0.05) / 0.3, 0), 1);
          const prob =
            y < 0.8
              ? r * Math.min(Math.max((0.8 - y) / 0.35, 0), 1)
              : 0.35 * Math.min(Math.max((x - 0.02) / 0.06, 0), 1);
          tries++;
          k = key(v, CONFIG.flakeGap);
          if (!(Math.random() > prob + 0.04 || used.has(k)) || tries >= 400) break;
        }
        used.add(k);
        setPos(pos, i, v, 0.0035);
        setDir(dir, i, CONFIG.dustAngle, CONFIG.dustFan, 0.6 + 0.6 * Math.random());
        setSeed(seed, i, Math.random());
        size[i] = 0.001 + 0.0015 * Math.random();
      },
      { repel: 0.5 * CONFIG.mouseRepel, limeShare: 0, flakes: 1, allFlakes: 1 }
    );

    // 4) pec flakes
    const K = CONFIG.pecBox;
    buildField(
      CONFIG.pecFlakes,
      (i, pos, dir, seed, size) => {
        let v = 0, tries = 0, k = "";
        for (;;) {
          v = pickVertex();
          tries++;
          const x = P[3 * v], y = P[3 * v + 1];
          const inBox = x > K[0] && x < K[1] && y > K[2] && y < K[3] && M[3 * v + 2] > 20;
          const prob = inBox
            ? 0.35 + 0.65 * ((x - K[0]) / (K[1] - K[0])) * ((y - K[2]) / (K[3] - K[2]))
            : 0;
          k = key(v, 0.4 * CONFIG.flakeGap);
          if (!(!inBox || Math.random() > prob || used.has(k)) || tries >= 2000) break;
        }
        used.add(k);
        setPos(pos, i, v, 0.0035);
        setDir(dir, i, CONFIG.dustAngle, CONFIG.dustFan, 0.6 + 0.6 * Math.random());
        setSeed(seed, i, Math.random());
        size[i] = 0.001 + 0.0015 * Math.random();
      },
      { repel: 0.5 * CONFIG.mouseRepel, limeShare: 0, flakes: 1, allFlakes: 1 }
    );
  }

  // ---------- pointer ----------
  const pointer = { x: 0, y: 0, active: false, last: -999 };
  const onPointer = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    pointer.active = true;
    pointer.last = performance.now() / 1000;
  };
  const onLeave = () => (pointer.active = false);
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerdown", onPointer, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  window.addEventListener("blur", onLeave);

  // ---------- animation ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const headAnchor = new THREE.Vector3();
  let headYaw = CONFIG.baseYaw;
  let bodyYaw = CONFIG.baseYaw;
  let headPitch = 0;
  let repelAmt = 0;
  let elapsed = 0;
  let lastFrame = 0;

  function frame(now) {
    if (disposed) return;
    rafId = requestAnimationFrame(frame);
    if (!ready || !visible || document.hidden) {
      lastFrame = 0;
      return;
    }

    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0.016;
    lastFrame = now;
    elapsed += dt;
    U.uTime.value = elapsed;

    const tracking = pointer.active && now / 1000 - pointer.last < CONFIG.idleAfter;

    let targetYaw, targetPitch;
    if (tracking && !reduced) {
      headAnchor.set(0, 0.8, 0).project(camera);
      targetYaw = clamp((pointer.x - headAnchor.x) * CONFIG.lookYaw, -0.85, 0.85);
      targetPitch = clamp(-(pointer.y - headAnchor.y) * CONFIG.lookPitch, -0.35, 0.35);
    } else {
      const m = reduced ? 0 : 1;
      targetYaw =
        CONFIG.baseYaw +
        m * (0.14 * Math.sin(0.45 * elapsed) + 0.05 * Math.sin(0.9 * elapsed + 1));
      targetPitch = 0.035 * m * Math.sin(0.33 * elapsed);
    }

    const kHead = 1 - Math.exp(-dt * CONFIG.headSpeed);
    const kBody = 1 - Math.exp(-1.8 * dt);

    headYaw += (targetYaw - headYaw) * kHead;
    headPitch += (targetPitch - headPitch) * kHead;
    bodyYaw +=
      (CONFIG.baseYaw + CONFIG.bodyFollow * (targetYaw - CONFIG.baseYaw) - bodyYaw) * kBody;

    root.rotation.y = bodyYaw;
    U.uYaw.value = clamp(headYaw - bodyYaw, -CONFIG.headMaxYaw, CONFIG.headMaxYaw);
    U.uPitch.value = headPitch;

    repelAmt += ((tracking ? 1 : 0) - repelAmt) * (1 - Math.exp(-4 * dt));
    U.uMouseOn.value = repelAmt;
    U.uMouse.value.set(pointer.x * viewHalfW, pointer.y * viewHalfH);

    renderer.render(scene, camera);
  }
  rafId = requestAnimationFrame(frame);

  // ---------- load ----------
  const abort = new AbortController();
  (async () => {
    try {
      const res = await fetch(MODEL_URL, { signal: abort.signal });
      if (!res.ok) throw new Error(`Could not load ${MODEL_URL} (${res.status})`);
      const mesh = parseMesh(await res.arrayBuffer());
      if (disposed) return;
      buildScene(mesh);
      ready = true;
      onReady?.(canvas);
    } catch (err) {
      if (err?.name !== "AbortError") console.error(err);
    }
  })();

  // ---------- cleanup ----------
  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(rafId);
      abort.abort();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      scene.traverse((obj) => {
        obj.geometry?.dispose();
        obj.material?.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

// =====================================================
// COMPONENT
// =====================================================
export default function Hero() {
  const sectionRef = useRef(null);
  const mountRef = useRef(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // GSAP intro for the text
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray(".hero-anim");
      if (reduced) {
        gsap.set(items, { opacity: 1, y: 0 });
      } else {
        gsap.fromTo(
          items,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.12, delay: 0.1 }
        );
      }
    }, sectionRef);

    // 3D silhouette (fades in once the model has loaded)
    const silhouette = createSilhouette(mountRef.current, {
      onReady: (canvas) =>
        gsap.to(canvas, { opacity: 1, duration: reduced ? 0 : 1.2, ease: "power2.out" }),
    });

    return () => {
      ctx.revert();
      silhouette.dispose();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-svh w-full flex-col overflow-hidden bg-white text-neutral-950 md:flex-row md:p-5"
    >
      {/* TEXT: top on mobile, left on md+ */}
     <div className=" relative z-10 flex w-full flex-col items-center justify-center px-6 pb-6 pt-28 text-center md:w-1/2 md:items-start md:px-12 md:py-0 md:text-left lg:px-20 md:translate-x-[64px]">
        {/* <p className="hero-anim mb-4 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.3em] text-neutral-500 opacity-0">
          <span className="h-px w-8 bg-[#d1d13d]" />
          {CONTENT.eyebrow}
        </p> */}

        <h1 className="hero-anim font-rajdhani text-4xl font-semibold leading-[1.05] tracking-tight opacity-0 sm:text-6xl lg:text-6xl">
         Curiosity asks what's possible. Engineering makes it real.
        </h1>

        <p className="hero-anim mt-6 max-w-xl text-base text-neutral-600 opacity-0 sm:text-lg">
          I'm Arghadwip Sarkar, an engineering student at VIT Chennai, building full-stack web applications, Android experiences, and practical AI/ML projects
        </p>

        <div className="hero-anim mt-8 flex flex-wrap items-center justify-center gap-4 opacity-0 md:justify-start">
          <a
            href={CONTENT.primary.href}
            className="rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            {CONTENT.primary.label}
          </a>
          <a
            href={CONTENT.secondary.href}
            className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium transition hover:border-neutral-950"
          >
            {CONTENT.secondary.label}
          </a>
        </div>
      </div>

      {/* 3D MODEL: below text on mobile, right on md+ */}
      <div className="relative min-h-[360px] w-full flex-1 md:w-1/2 md:flex-none">
       <div ref={mountRef} className="absolute inset-0 md:translate-y-[110px]  md:scale-110" />
      </div>
    </section>
  );
}