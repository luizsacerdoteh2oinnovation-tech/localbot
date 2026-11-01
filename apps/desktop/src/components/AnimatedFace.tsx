import { useEffect, useRef } from "react";
import type { Face } from "../types";

/**
 * A bot's face as a small 3D ball with the face on its surface, ported from the
 * macOS app (AnimatedFace.swift). Bots mostly hold still, now and then turn to
 * look somewhere, blink and slip into a mood. Working bots read line by line.
 * Each bot gets its own rhythm from its id. Reduced motion freezes it.
 */
type Motion = {
  yaw: number; pitch: number; gazeX: number; gazeY: number; openness: number;
  leftSize: number; rightSize: number; squint: number; widen: number; tilt: number;
  mouthX: number; mouthY: number; bob: number;
};
type Reaction = "noticed" | "done" | "oops";
const DURATION: Record<Reaction, number> = { noticed: 0.9, done: 1.6, oops: 2.2 };
const MOODS = ["none", "happy", "surprised", "sleepy", "curious"] as const;

const stillMotion = (): Motion => ({
  yaw: -0.32, pitch: 0.1, gazeX: 0, gazeY: 0, openness: 1, leftSize: 1, rightSize: 1,
  squint: 0, widen: 0, tilt: 0, mouthX: 1, mouthY: 1, bob: 0,
});

const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.min(Math.max(x, 0), 1) * Math.PI);
/** 0 → 1 → 0 over [start, end], easing in and out over `edge` seconds. */
const win = (g: number, start: number, end: number, edge: number) =>
  Math.min(ease((g - start) / edge), 1 - ease((g - (end - edge)) / edge));
/** Stable pseudo-random number in [0, 1) for a time slot. */
const rand = (n: number, salt: number) => {
  const x = Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function express(m: Motion, mood: (typeof MOODS)[number], k: number, side: number) {
  switch (mood) {
    case "happy": m.squint = k; m.mouthX = 1 + 0.2 * k; m.tilt = side * 0.12 * k; break;
    case "surprised": m.widen = k; m.mouthX = 1 - 0.2 * k; m.mouthY = 1 + 0.6 * k; m.gazeY -= k; break;
    case "sleepy": m.openness *= 1 - 0.6 * k; m.gazeY += 1.2 * k; m.tilt = side * 0.08 * k; m.pitch += 0.12 * k; m.mouthX = 1 - 0.15 * k; break;
    case "curious":
      if (side > 0) m.rightSize = 1 + 0.2 * k; else m.leftSize = 1 + 0.2 * k;
      m.tilt = side * 0.16 * k; m.gazeX += side * 1.5 * k; m.yaw += side * 0.15 * k; break;
  }
}

/** Mostly still: every few seconds the head may turn to a new spot, the eyes leading. */
function idle(m: Motion, t: number) {
  const seg = 4.8;
  const i = Math.floor(t / seg), g = t - i * seg;
  const target = (n: number): [number, number] =>
    rand(n, 1) > 0.5 ? [rand(n, 2) * 1.2 - 0.6, rand(n, 3) * 0.3 - 0.06] : [-0.3, 0.1];
  const [py, pp] = target(i - 1), [cy, cp] = target(i);
  const head = ease(g / 0.7), eyes = ease(g / 0.18);
  m.yaw = py + (cy - py) * head;
  m.pitch = pp + (cp - pp) * head;
  m.gazeX = (cy - py) * (eyes - head) * 6;
  m.gazeY = (cp - pp) * (eyes - head) * 6;
  const mlen = 9.7;
  const n = Math.floor(t / mlen), mg = t - n * mlen;
  const mood = MOODS[Math.floor(rand(n, 7) * MOODS.length) % MOODS.length];
  express(m, mood, win(mg, 3.6, 6.2, 0.3), rand(n, 8) > 0.5 ? 1 : -1);
}

/** Reading: the head steps across a line and back, the eyes snapping ahead. */
function read(m: Motion, t: number) {
  const seg = 0.9, stops = [-0.4, -0.15, 0.1, 0.35];
  const i = Math.floor(t / seg), g = t - i * seg;
  const step = (n: number) => stops[((n % 4) + 4) % 4];
  const prev = step(i - 1), cur = step(i);
  const head = ease(g / 0.35), eyes = ease(g / 0.12);
  m.yaw = prev + (cur - prev) * head;
  m.pitch = 0.14;
  m.gazeX = (cur - prev) * (eyes - head) * 6 + cur * 2;
  m.gazeY = -1.2;
  m.squint = 0.22;
  m.mouthX = 0.85;
  const aha = win(t % 7.1, 6.2, 6.9, 0.15);
  m.widen = aha;
  m.squint *= 1 - aha;
  m.mouthY = 1 + 0.3 * aha;
}

function motionAt(t: number, working: boolean): Motion {
  const m = stillMotion();
  // Blink: a quick close/open every ~4.2 s, plus a double blink every third cycle.
  const period = 4.2, cycle = t % period;
  const blink = (start: number) => {
    const d = cycle - start;
    return d < 0 || d >= 0.16 ? 1 : 0.12 + 0.88 * Math.abs(Math.cos((d / 0.16) * Math.PI));
  };
  m.openness = Math.min(blink(0), Math.floor(t / period) % 3 === 0 ? blink(0.24) : 1);
  m.bob = Math.sin(t * 1.6) * 0.5;
  if (working) read(m, t); else idle(m, t);
  m.openness = Math.max(m.openness, 0.12 + 0.5 * m.squint);
  return m;
}

/** Layers a reaction over whatever the bot is doing, fading in and out. */
function react(m: Motion, kind: Reaction, age: number) {
  if (age < 0 || age >= DURATION[kind]) return;
  const k = win(age, 0, DURATION[kind], 0.15);
  const mix = (from: number, to: number) => from + (to - from) * k;
  if (kind === "noticed") {
    m.widen = Math.max(m.widen, k); m.squint *= 1 - k;
    m.yaw = mix(m.yaw, -0.1); m.pitch = mix(m.pitch, -0.05);
    m.gazeX = mix(m.gazeX, 0); m.gazeY = mix(m.gazeY, -0.8);
    m.bob -= 2.2 * Math.sin(Math.min(age / 0.4, 1) * Math.PI);
    m.mouthX = mix(m.mouthX, 0.75); m.mouthY = mix(m.mouthY, 1.4);
  } else if (kind === "done") {
    m.squint = Math.max(m.squint, k); m.widen *= 1 - k;
    m.mouthX = mix(m.mouthX, 1.3); m.mouthY = mix(m.mouthY, 1.15);
    m.tilt = mix(m.tilt, 0.12); m.yaw = mix(m.yaw, -0.2); m.gazeX = mix(m.gazeX, 0);
    m.bob -= 2.8 * Math.abs(Math.sin(Math.min(age / 0.9, 1) * 2 * Math.PI));
  } else {
    m.widen *= 1 - k; m.squint *= 1 - k; m.openness *= 1 - 0.4 * k;
    m.gazeX = mix(m.gazeX, 0); m.gazeY = mix(m.gazeY, 1.6);
    m.tilt = mix(m.tilt, -0.1); m.mouthX = mix(m.mouthX, 0.7); m.pitch = mix(m.pitch, 0.22);
    m.yaw = mix(m.yaw, -0.2) + 0.25 * k * Math.sin(age * 9);
  }
}

/** Half width and half height of the ball in the 64×64 face space. */
const RADII: Record<string, [number, number]> = {
  round: [27, 27], egg: [23, 27], wide: [29, 21], bean: [27, 23], star: [29, 29], asterisk: [29, 29],
};
/** Superellipse exponent: 2 is an ellipse; higher flattens the sides into corners. */
const SQUARE: Record<string, number> = { round: 2, egg: 2.2, wide: 3.4, bean: 2.8, star: 2, asterisk: 2 };

function shapeOf(face: Face) {
  if (face.shape && face.shape in RADII) return face.shape;
  // Older brains don't send a shape: derive it the way they used to.
  const names = Object.keys(RADII);
  let sum = 0;
  for (const b of new TextEncoder().encode(face.fill + face.eyes + face.mouth + face.accessory)) sum = (Math.imul(sum, 31) + b) >>> 0;
  return names[sum % names.length];
}

function bodyPath(ctx: CanvasRenderingContext2D, shape: string) {
  ctx.beginPath();
  const star = shape === "star", asterisk = shape === "asterisk";
  const steps = star || asterisk ? 240 : 72;
  const [a, b] = RADII[shape], n = SQUARE[shape];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    let x: number, y: number;
    if (star || asterisk) {
      const wave = star ? (1 + Math.cos(5 * (t + Math.PI / 2))) / 2 : Math.pow(Math.abs(Math.cos(3 * (t + Math.PI / 2))), 4);
      const base = star ? 0.62 : 0.6;
      const r = 29 * (base + (1 - base) * wave);
      x = 32 + r * Math.cos(t); y = 32 + r * Math.sin(t);
    } else {
      const c = Math.cos(t), s = Math.sin(t);
      x = 32 + a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      y = 32 + b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    }
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

const rgb = (hex: string) => {
  const v = parseInt(hex.replace("#", ""), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
const shade = (hex: string, factor: number) =>
  `rgb(${rgb(hex).map((c) => Math.round(Math.min(Math.max(c * factor, 0), 255))).join(",")})`;

const INK = "#fff", EYE_Y = 31, LEFT = 22, RIGHT = 42;

function draw(ctx: CanvasRenderingContext2D, face: Face, m: Motion) {
  const shape = shapeOf(face);
  const [ra, rb] = RADII[shape];
  // A softly lit ball: light toward the upper left, slightly deeper at the far edge.
  const hx = 32 - ra * 0.3, hy = 32 - rb * 0.35;
  const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, Math.max(ra, rb) * 1.7);
  grad.addColorStop(0, shade(face.fill, 1.05));
  grad.addColorStop(0.5, face.fill);
  grad.addColorStop(1, shade(face.fill, 0.86));
  bodyPath(ctx, shape);
  ctx.fillStyle = grad;
  ctx.fill();

  // The face sits on the ball's front plane: slides toward the limb and squeezes as it turns.
  const sx = Math.cos(m.yaw) * 0.86, sy = Math.cos(m.pitch) * 0.86;
  const cx = 32 + ra * 0.78 * Math.sin(m.yaw) * Math.cos(m.pitch), cy = 32 + rb * 0.78 * Math.sin(m.pitch);
  ctx.transform(sx, 0, -Math.sin(m.yaw) * Math.sin(m.pitch) * 0.3, sy, cx - 32 * sx, cy - 32 * sy);
  ctx.translate(32, 36 + m.bob);
  ctx.rotate(m.tilt);
  ctx.translate(-32, -36);

  if (face.accessory === "cheeks") {
    ctx.fillStyle = `rgba(${rgb(face.deep).join(",")},0.3)`;
    for (const x of [17, 47]) { ctx.beginPath(); ctx.arc(x, 40, 3, 0, 2 * Math.PI); ctx.fill(); }
  }

  // An eye: gaze and blink applied around its center; a squint lifts and flattens it,
  // surprise enlarges it, a blink squashes it and widens it a touch.
  const eye = (x: number, paint: () => void) => {
    ctx.save();
    ctx.translate(x + m.gazeX, EYE_Y + m.gazeY - m.squint * 1.2);
    const size = x < 31 ? m.leftSize : x > 33 ? m.rightSize : (m.leftSize + m.rightSize) / 2;
    const grow = (1 + 0.28 * m.widen) * size;
    ctx.scale(grow * (1 + 0.15 * (1 - m.openness)), grow * Math.max(m.openness, 0.08) * (1 - 0.5 * m.squint));
    paint();
    ctx.restore();
  };
  ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineCap = "round";
  const pair = (paint: () => void) => { eye(LEFT, paint); eye(RIGHT, paint); };
  switch (face.eyes) {
    case "dot": pair(() => { ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, 2 * Math.PI); ctx.fill(); }); break;
    case "pill": pair(() => { ctx.beginPath(); ctx.roundRect(-2.6, -5.5, 5.2, 11, 2.6); ctx.fill(); }); break;
    case "visor": eye((LEFT + RIGHT) / 2, () => { ctx.beginPath(); ctx.roundRect(-(RIGHT - LEFT) / 2 - 5, -2.5, RIGHT - LEFT + 10, 5, 2.5); ctx.fill(); }); break;
    case "ring": pair(() => { ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, 3.8, 0, 2 * Math.PI); ctx.stroke(); }); break;
    case "happy": pair(() => { ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-4, 1.5); ctx.quadraticCurveTo(0, -4.5, 4, 1.5); ctx.stroke(); }); break;
    case "spark": pair(() => {
      const pts = [[0, -5], [1.4, -1.4], [5, 0], [1.4, 1.4], [0, 5], [-1.4, 1.4], [-5, 0], [-1.4, -1.4]];
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
    }); break;
  }

  ctx.translate(32, 43); ctx.scale(m.mouthX, m.mouthY); ctx.translate(-32, -43);
  switch (face.mouth) {
    case "smile": ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(25, 42); ctx.quadraticCurveTo(32, 48, 39, 42); ctx.stroke(); break;
    case "line": ctx.beginPath(); ctx.roundRect(26, 42, 12, 2.4, 1.2); ctx.fill(); break;
    case "dot": ctx.beginPath(); ctx.arc(32, 43.5, 1.9, 0, 2 * Math.PI); ctx.fill(); break;
    case "o": ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(32, 43.5, 2.6, 3.2, 0, 0, 2 * Math.PI); ctx.stroke(); break;
    case "grin": ctx.beginPath(); ctx.moveTo(25, 41); ctx.quadraticCurveTo(32, 49, 39, 41); ctx.closePath(); ctx.fill(); break;
  }
}

export function AnimatedFace({ face, size = 28, working = false, seed = "", failed = false, still = false }: {
  face: Face; size?: number; working?: boolean; seed?: string; failed?: boolean;
  /** Drawn once, not animated: older faces in a chat. */
  still?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ working, failed });
  const reaction = useRef<{ kind: Reaction; at: number } | null>(null);
  const was = useRef({ working, failed });
  live.current = { working, failed };

  // A short reaction to a request starting or finishing.
  useEffect(() => {
    const now = performance.now() / 1000;
    if (working !== was.current.working) reaction.current = { kind: working ? "noticed" : failed ? "oops" : "done", at: now };
    else if (failed && !was.current.failed) reaction.current = { kind: "oops", at: now };
    was.current = { working, failed };
  }, [working, failed]);

  useEffect(() => {
    const el = canvas.current!, ctx = el.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    el.width = el.height = Math.round(size * dpr);
    // Desynchronizes blinks between bots.
    let h = 0;
    for (const ch of seed) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
    const phase = (Math.abs(h) % 10000) / 10000 * 40;
    const frame = (animated: boolean) => {
      const time = performance.now() / 1000;
      const m = animated ? motionAt(time + phase, live.current.working) : stillMotion();
      if (animated && reaction.current) react(m, reaction.current.kind, time - reaction.current.at);
      ctx.setTransform(dpr * size / 64, 0, 0, dpr * size / 64, 0, 0);
      ctx.clearRect(0, 0, 64, 64);
      draw(ctx, face, m);
    };
    if (still || matchMedia("(prefers-reduced-motion: reduce)").matches) { frame(false); return; }
    let raf = 0, last = 0;
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      if (ts - last < 33) return; // 30 fps
      last = ts;
      frame(true);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [face, size, seed, still]);

  return <canvas ref={canvas} className="avatar-img" style={{ width: size, height: size }} aria-hidden />;
}
