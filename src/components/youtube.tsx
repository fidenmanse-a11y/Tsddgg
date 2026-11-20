import React from "react";
import { Img, staticFile } from "remotion";
import { CHANNEL, Video, thumb } from "../data/channel";
import { F } from "../fonts";

// Nachbau der YouTube-Oberfläche (Dark Mode, deutsche Lokalisierung)
// mit ausschließlich echten Kanal-Daten.

export const YT = {
  bg: "#0f0f0f",
  text: "#f1f1f1",
  sub: "#aaaaaa",
  chip: "rgba(255,255,255,0.1)",
};

export const PlayLogo: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <svg width={size * 1.42} height={size} viewBox="0 0 142 100">
    <rect x="0" y="0" width="142" height="100" rx="28" fill="#ff0033" />
    <path d="M57 30 L95 50 L57 70 Z" fill="#fff" />
  </svg>
);

export const TopBar: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      right: 0,
      height: 84,
      display: "flex",
      alignItems: "center",
      padding: "0 36px",
      gap: 30,
      fontFamily: F.yt,
      color: YT.text,
      background: YT.bg,
      zIndex: 5,
    }}
  >
    <svg width="36" height="36" viewBox="0 0 24 24" fill="#fff">
      <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
    </svg>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <PlayLogo size={30} />
      <span style={{ fontWeight: 700, fontSize: 30, letterSpacing: -1.2 }}>YouTube</span>
      <span style={{ fontSize: 14, color: YT.sub, marginTop: -16 }}>DE</span>
    </div>
    <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: 820,
          height: 56,
          borderRadius: 28,
          border: "1.5px solid #303030",
          background: "#121212",
          display: "flex",
          alignItems: "center",
          padding: "0 26px",
          fontSize: 22,
          color: "#888",
          justifyContent: "space-between",
        }}
      >
        <span>Suchen</span>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#ddd">
          <path d="M20.87 20.17l-5.59-5.59A7.5 7.5 0 1 0 14.58 15.3l5.59 5.59.7-.72zM10 16a6 6 0 1 1 0-12 6 6 0 0 1 0 12z" />
        </svg>
      </div>
    </div>
    <div style={{ width: 46, height: 46, borderRadius: 23, background: "#5c2fb8" }} />
  </div>
);

export const Chips: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 96,
      left: 132,
      display: "flex",
      gap: 16,
      fontFamily: F.yt,
      fontWeight: 500,
      fontSize: 20,
      zIndex: 4,
    }}
  >
    {["Alle", "Minecraft", "Gaming", "SMP", "PvP", "Live", "Kürzlich hochgeladen", "Neu für dich"].map(
      (c, i) => (
        <div
          key={c}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            background: i === 0 ? "#f1f1f1" : YT.chip,
            color: i === 0 ? "#0f0f0f" : YT.text,
          }}
        >
          {c}
        </div>
      ),
    )}
  </div>
);

export const SideRail: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 84,
      left: 0,
      width: 108,
      bottom: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 34,
      paddingTop: 18,
      fontFamily: F.yt,
      fontSize: 13,
      color: YT.text,
      background: YT.bg,
      zIndex: 4,
    }}
  >
    {["Startseite", "Shorts", "Abos", "Du"].map((l) => (
      <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ width: 30, height: 26, borderRadius: 6, border: "2.5px solid #f1f1f1" }} />
        {l}
      </div>
    ))}
  </div>
);

export const CARD_W = 420;
export const THUMB_H = (CARD_W * 9) / 16;

export const VideoCard: React.FC<{
  v: Video;
  hover?: number; // 0..1
  progress?: number; // Inline-Preview Fortschritt 0..1
  width?: number;
}> = ({ v, hover = 0, progress = 0, width = CARD_W }) => {
  const th = (width * 9) / 16;
  return (
    <div style={{ width, fontFamily: F.yt, color: YT.text }}>
      <div
        style={{
          position: "relative",
          width,
          height: th,
          borderRadius: 14 * (1 - hover * 0.6),
          overflow: "hidden",
          transform: `scale(${1 + hover * 0.035})`,
          boxShadow: hover > 0 ? `0 ${20 * hover}px ${50 * hover}px rgba(0,0,0,${0.5 * hover})` : undefined,
        }}
      >
        <Img src={staticFile(thumb(v.id))} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            right: 10,
            bottom: progress > 0 ? 16 : 10,
            background: "rgba(0,0,0,0.8)",
            borderRadius: 6,
            padding: "2px 7px",
            fontSize: 17,
            fontWeight: 500,
          }}
        >
          {v.duration}
        </div>
        {progress > 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: "rgba(255,255,255,0.3)" }}>
            <div style={{ width: `${progress * 100}%`, height: "100%", background: "#ff0033" }} />
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
        <Img
          src={staticFile(CHANNEL.avatar)}
          style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0 }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 21,
              fontWeight: 500,
              lineHeight: "29px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {v.title}
          </div>
          <div style={{ fontSize: 18, color: YT.sub, marginTop: 6 }}>{v.collab ?? CHANNEL.name}</div>
          <div style={{ fontSize: 18, color: YT.sub }}>
            {v.views} Aufrufe{v.published ? ` • ${v.published}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Cursor: React.FC<{ x: number; y: number; down?: number; scale?: number }> = ({
  x,
  y,
  down = 0,
  scale = 1,
}) => (
  <svg
    width={34 * scale}
    height={48 * scale}
    viewBox="0 0 17 24"
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `scale(${1 - down * 0.15})`,
      transformOrigin: "0 0",
      filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.5))",
      zIndex: 50,
    }}
  >
    <path d="M1 1 L1 19 L5.5 14.8 L8.6 22 L11.6 20.7 L8.6 13.7 L14.6 13.4 Z" fill="#fff" stroke="#000" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

export const SubscribeButton: React.FC<{ state: number; scale?: number }> = ({ state, scale = 1 }) => {
  // state 0 = "Abonnieren", 1 = "Abonniert"
  const subbed = state >= 0.5;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: subbed ? "0 30px 0 24px" : "0 34px",
        height: 64 * scale,
        borderRadius: 40,
        background: subbed ? "#272727" : "#f1f1f1",
        color: subbed ? "#f1f1f1" : "#0f0f0f",
        fontFamily: F.yt,
        fontWeight: 500,
        fontSize: 26 * scale,
        transform: `scale(${scale})`,
      }}
    >
      {subbed && (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#f1f1f1">
          <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
      )}
      {subbed ? "Abonniert" : "Abonnieren"}
    </div>
  );
};
