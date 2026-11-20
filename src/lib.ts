import { interpolate, Easing } from "remotion";
import { noise2D } from "@remotion/noise";

export const FPS = 60;
export const BEAT = 24; // 150 BPM @ 60 fps -> exakt 24 Frames pro Beat
export const W = 1920;
export const H = 1080;

/** Beats -> Frames */
export const b = (beats: number) => Math.round(beats * BEAT);

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export const E = {
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outCubic: Easing.out(Easing.cubic),
  inCubic: Easing.in(Easing.cubic),
  inOutCubic: Easing.inOut(Easing.cubic),
  inOutQuint: Easing.inOut(Easing.poly(5)),
  outQuint: Easing.out(Easing.poly(5)),
  outBack: Easing.out(Easing.back(2.2)),
  outBackSoft: Easing.out(Easing.back(1.3)),
  outElastic: Easing.out(Easing.elastic(1.1)),
};

/** 0..1 Fortschritt in einem Fenster, mit optionalem Easing */
export const prog = (
  frame: number,
  start: number,
  dur: number,
  ease: (t: number) => number = (t) => t,
) => ease(clamp((frame - start) / Math.max(1, dur)));

export const lerp = (a: number, c: number, t: number) => a + (c - a) * t;

export const map = (
  frame: number,
  input: number[],
  output: number[],
  ease?: (t: number) => number,
) =>
  interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

/**
 * Summe exponentiell abklingender Impulse – für Shakes, Flashes, Aberration.
 * hits: Frame-Positionen, an denen etwas "einschlägt".
 */
export const impulse = (
  frame: number,
  hits: { at: number; amp?: number; decay?: number }[],
) => {
  let v = 0;
  for (const h of hits) {
    const dt = frame - h.at;
    if (dt < 0) continue;
    v += (h.amp ?? 1) * Math.exp(-dt / (h.decay ?? 8));
  }
  return v;
};

/** Organischer Kamera-Shake (Noise, nicht Zufall pro Frame) */
export const shake = (frame: number, amount: number, seed = "s", speed = 0.9) => ({
  x: noise2D(seed + "x", frame * speed * 0.35, 0) * amount * 38,
  y: noise2D(seed + "y", 0, frame * speed * 0.35) * amount * 26,
  r: noise2D(seed + "r", frame * speed * 0.2, 7) * amount * 2.2,
});

/** Langsamer, "handgehaltener" Drift */
export const drift = (frame: number, amount = 1, seed = "d") => ({
  x: noise2D(seed + "x", frame * 0.008, 1) * 14 * amount,
  y: noise2D(seed + "y", 3, frame * 0.008) * 10 * amount,
  r: noise2D(seed + "r", frame * 0.005, 5) * 0.5 * amount,
});

/** Deterministischer Pseudo-Zufall */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const COLORS = {
  violet: "#8b3dff",
  violetDeep: "#4b14a8",
  magenta: "#e23cff",
  ink: "#07040d",
  white: "#ffffff",
  ytBg: "#0f0f0f",
  ytRed: "#ff0033",
  mcYellow: "#ffff55",
  mcGreen: "#55ff55",
  mcGray: "#aaaaaa",
  mcRed: "#ff5555",
};
