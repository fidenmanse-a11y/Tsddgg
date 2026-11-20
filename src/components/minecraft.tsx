import React from "react";
import { Img, staticFile } from "remotion";
import { F } from "../fonts";

// Minecraft-artige UI-Elemente (eigene Nachzeichnung, Pixel-Look).

const px = (n: number) => `${n}px`;

/** Item-Tooltip im Stil des Spiels: dunkles Lila, violetter Rahmen */
export const Tooltip: React.FC<{
  title: string;
  lines: { text: string; color?: string }[];
  scale?: number;
  style?: React.CSSProperties;
}> = ({ title, lines, scale = 1, style }) => (
  <div
    style={{
      position: "relative",
      padding: `${px(18 * scale)} ${px(26 * scale)}`,
      background: "rgba(16, 0, 16, 0.94)",
      border: `${px(6 * scale)} solid #25015b`,
      boxShadow: `inset 0 0 0 ${px(4 * scale)} #5000c8`,
      fontFamily: F.mc,
      color: "#fff",
      maxWidth: 820 * scale,
      ...style,
    }}
  >
    <div style={{ fontSize: 44 * scale, fontWeight: 700, color: "#ff55ff", textShadow: `${px(4 * scale)} ${px(4 * scale)} 0 #3f153f`, lineHeight: 1.15 }}>
      {title}
    </div>
    {lines.map((l, i) => (
      <div
        key={i}
        style={{
          fontSize: 32 * scale,
          marginTop: 8 * scale,
          color: l.color ?? "#aaaaaa",
          textShadow: `${px(3 * scale)} ${px(3 * scale)} 0 #2a2a2a`,
        }}
      >
        {l.text}
      </div>
    ))}
  </div>
);

/** "Fortschritt erzielt!"-Toast */
export const Advancement: React.FC<{
  title: string;
  icon: string;
  state?: "done" | "pending" | "failed";
  spin?: number;
}> = ({ title, icon, state = "done", spin = 0 }) => (
  <div
    style={{
      width: 640,
      height: 128,
      background: "#212121",
      border: "6px solid #000",
      boxShadow: "inset 0 0 0 4px #555, inset 0 0 0 8px #1a1a1a",
      display: "flex",
      alignItems: "center",
      gap: 22,
      padding: "0 24px",
      fontFamily: F.mc,
      imageRendering: "pixelated",
    }}
  >
    <div style={{ width: 84, height: 84, flexShrink: 0, position: "relative", border: "4px solid #8b8b8b", background: "#373737", overflow: "hidden" }}>
      <Img src={staticFile(icon)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: 27,
          whiteSpace: "nowrap",
          color: state === "failed" ? "#ff5555" : "#ffff55",
          textShadow: "3px 3px 0 #3f3f15",
        }}
      >
        {state === "failed" ? "Fortschritt verweigert!" : state === "pending" ? "Wird geprüft …" : "Fortschritt erzielt!"}
      </div>
      <div style={{ fontSize: 30, color: "#fff", textShadow: "3px 3px 0 #3f3f3f", marginTop: 4, whiteSpace: "nowrap" }}>{title}</div>
    </div>
    <div style={{ width: 70, display: "flex", justifyContent: "center" }}>
      {state === "done" && <PixelCheck size={60} />}
      {state === "failed" && <PixelCross size={60} />}
      {state === "pending" && <Spinner rot={spin} />}
    </div>
  </div>
);

export const PixelCheck: React.FC<{ size?: number; color?: string }> = ({ size = 60, color = "#55ff55" }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" shapeRendering="crispEdges">
    {[
      [8, 2], [7, 3], [8, 3], [6, 4], [7, 4], [5, 5], [6, 5], [1, 5], [1, 4], [2, 5], [2, 6], [3, 6], [4, 6], [3, 7], [4, 7], [5, 6],
    ].map(([x, y], i) => (
      <rect key={i} x={x} y={y} width="1" height="1" fill={color} />
    ))}
  </svg>
);

export const PixelCross: React.FC<{ size?: number }> = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" shapeRendering="crispEdges">
    {Array.from({ length: 8 }).flatMap((_, i) => [
      <rect key={`a${i}`} x={1 + i} y={1 + i} width="1.2" height="1.2" fill="#ff5555" />,
      <rect key={`b${i}`} x={8 - i} y={1 + i} width="1.2" height="1.2" fill="#ff5555" />,
    ])}
  </svg>
);

const Spinner: React.FC<{ rot: number }> = ({ rot }) => (
  <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: `rotate(${rot}deg)` }}>
    <circle cx="28" cy="28" r="22" stroke="#555" strokeWidth="6" fill="none" />
    <path d="M28 6 A22 22 0 0 1 50 28" stroke="#fff" strokeWidth="6" fill="none" />
  </svg>
);

/** Hotbar mit 9 Slots, Slots können echte Thumbnails enthalten */
export const Hotbar: React.FC<{ items: (string | null)[]; selected: number; scale?: number }> = ({
  items,
  selected,
  scale = 1,
}) => {
  const s = 88 * scale;
  return (
    <div
      style={{
        display: "flex",
        background: "rgba(20,20,20,0.85)",
        border: `${4 * scale}px solid #000`,
        boxShadow: `inset 0 0 0 ${4 * scale}px #6f6f6f`,
        padding: 4 * scale,
        position: "relative",
      }}
    >
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            width: s,
            height: s,
            margin: 2 * scale,
            background: "#8b8b8b",
            boxShadow: `inset ${4 * scale}px ${4 * scale}px 0 #373737, inset -${4 * scale}px -${4 * scale}px 0 #fff3`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {it && (
            <Img
              src={staticFile(it)}
              style={{ position: "absolute", inset: 8 * scale, width: s - 16 * scale, height: s - 16 * scale, objectFit: "cover" }}
            />
          )}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          top: -4 * scale,
          left: 4 * scale + selected * (s + 4 * scale) - 4 * scale,
          width: s + 12 * scale,
          height: s + 16 * scale,
          border: `${6 * scale}px solid #fff`,
          outline: `${3 * scale}px solid #000`,
        }}
      />
    </div>
  );
};

export const XPBar: React.FC<{ fill: number; level: number; width?: number }> = ({ fill, level, width = 1000 }) => (
  <div style={{ position: "relative", width, height: 22 }}>
    <div style={{ position: "absolute", inset: 0, background: "#1a1a1a", border: "3px solid #000" }} />
    <div style={{ position: "absolute", left: 3, top: 3, bottom: 3, width: `calc(${fill * 100}% - 6px)`, background: "linear-gradient(#a6ff4f,#5fcf1f)" }} />
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: -54,
        transform: "translateX(-50%)",
        fontFamily: F.mc,
        fontWeight: 700,
        fontSize: 54,
        color: "#80ff20",
        textShadow: "4px 0 0 #000, -4px 0 0 #000, 0 4px 0 #000, 0 -4px 0 #000",
      }}
    >
      {level}
    </div>
  </div>
);
