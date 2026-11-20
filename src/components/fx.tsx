import React, { useId } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { rand, W, H } from "../lib";

/** Echte RGB-Kanal-Trennung per SVG-Filter (kein Fake-Glow). */
export const Chroma: React.FC<{
  amount: number;
  angle?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ amount, angle = 0, children, style }) => {
  const raw = useId();
  const id = "ca" + raw.replace(/[^a-zA-Z0-9]/g, "");
  if (Math.abs(amount) < 1.2) {
    return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
  }
  const dx = Math.cos(angle) * amount;
  const dy = Math.sin(angle) * amount;
  return (
    <AbsoluteFill style={style}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter
          id={id}
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
          colorInterpolationFilters="sRGB"
        >
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="r"
          />
          <feOffset in="r" dx={dx} dy={dy} result="ro" />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="g"
          />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="bl"
          />
          <feOffset in="bl" dx={-dx} dy={-dy} result="bo" />
          <feBlend in="ro" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="bo" mode="screen" />
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Datamosh-artiger Slice-Glitch: Inhalt in Streifen zerschnitten und versetzt. */
export const Glitch: React.FC<{
  active: boolean;
  intensity?: number;
  seed?: number;
  slices?: number;
  children: React.ReactNode;
}> = ({ active, intensity = 1, seed = 1, slices = 9, children }) => {
  const frame = useCurrentFrame();
  if (!active) return <AbsoluteFill>{children}</AbsoluteFill>;
  // alle 2 Frames neues Muster -> wirkt "digital", nicht weich
  const f = Math.floor(frame / 2);
  const cuts: number[] = [0];
  for (let i = 1; i < slices; i++) cuts.push(rand(seed * 31 + f * 7 + i) * 100);
  cuts.push(100);
  cuts.sort((a, c) => a - c);
  return (
    <AbsoluteFill>
      {cuts.slice(0, -1).map((top, i) => {
        const bottom = cuts[i + 1];
        const r = rand(seed * 13 + f * 3 + i * 17);
        const off = (r - 0.5) * 2 * 120 * intensity * (r > 0.55 || r < 0.2 ? 1 : 0.1);
        const hue = r > 0.85 ? 90 : 0;
        return (
          <AbsoluteFill
            key={i}
            style={{
              clipPath: `inset(${top}% 0 ${100 - bottom}% 0)`,
              transform: `translateX(${off}px)`,
              filter: hue ? `hue-rotate(${hue}deg) saturate(1.6)` : undefined,
            }}
          >
            {children}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

/** Filmkorn – pro Frame neuer Seed */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ mixBlendMode: "overlay", opacity, pointerEvents: "none" }}>
      <svg width={W} height={H}>
        <filter id={`grain${Math.floor(frame) % 64}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={2}
            seed={Math.floor(frame) % 64}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={W} height={H} filter={`url(#grain${Math.floor(frame) % 64})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Flash: React.FC<{ opacity: number; color?: string }> = ({
  opacity,
  color = "#fff",
}) =>
  opacity > 0.003 ? (
    <AbsoluteFill style={{ background: color, opacity, pointerEvents: "none" }} />
  ) : null;

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

export const Letterbox: React.FC<{ amount: number }> = ({ amount }) => {
  const h = 132 * amount;
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: h, background: "#000" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h, background: "#000" }} />
    </>
  );
};

/** Scanline/Zeilen-Overlay für Freeze-Frames (Video-Player-Look) */
export const Scanlines: React.FC<{ opacity?: number }> = ({ opacity = 0.12 }) => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "repeating-linear-gradient(0deg, rgba(0,0,0,0.6) 0px, rgba(0,0,0,0.6) 1px, transparent 2px, transparent 4px)",
      opacity,
      pointerEvents: "none",
    }}
  />
);
