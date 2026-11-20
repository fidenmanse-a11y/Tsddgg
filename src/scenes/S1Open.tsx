import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { VIDEOS } from "../data/channel";
import { TopBar, Chips, SideRail, VideoCard, Cursor, CARD_W, THUMB_H, YT } from "../components/youtube";
import { E, map, prog, lerp, W, H, impulse, shake } from "../lib";
import { SEC, ws, we, ls } from "../timeline";
import { Chroma } from "../components/fx";

// 0:00 – 0:04  "Okay, okay, okay … WAS IST DAS DENN?!"
// Echte YouTube-Startseite mit Revanchie-Videos. Scroll-Doubletake, Hover,
// zwei Punch-Ins auf "WAS" und "DENN", dann Crash-Zoom IN das Thumbnail.

const GRID = [
  ["rAa4f9RQCP8", "WaBZP5Uy2nA", "QJw0v8rWq90", "Rfj5lAsYpZs"],
  ["0c5uPCQwZO0", "cqVsmIshzLc", "tS_BQ12nfjk", "Eq2_E58U2S8"],
  ["2oXza_81aYY", "gtwiE_Cul84", "rbj0AadIZtE", "ZaLb3fu6j-Y"],
  ["veJacP4gTIU", "QPQtvx-q1eo", "Rfj5lAsYpZs", "0c5uPCQwZO0"],
];
const X0 = 132;
const Y0 = 168;
const GAP = 24;
const ROW_H = 410;
const TARGET = { col: 1, row: 0 };
const tx = X0 + TARGET.col * (CARD_W + GAP);
const ty = Y0 + TARGET.row * ROW_H;

const Page: React.FC<{ scroll: number; hover: number; progress: number }> = ({ scroll, hover, progress }) => (
  <AbsoluteFill style={{ background: YT.bg }}>
    <div style={{ position: "absolute", left: 0, top: -scroll, width: W }}>
      {GRID.map((row, r) =>
        row.map((id, c) => {
          const isT = r === TARGET.row && c === TARGET.col;
          return (
            <div key={`${r}-${c}`} style={{ position: "absolute", left: X0 + c * (CARD_W + GAP), top: Y0 + r * ROW_H }}>
              <VideoCard v={VIDEOS[id]} hover={isT ? hover : 0} progress={isT ? progress : 0} />
            </div>
          );
        }),
      )}
    </div>
    <SideRail />
    <TopBar />
    <Chips />
  </AbsoluteFill>
);

export const S1Open: React.FC = () => {
  const frame = useCurrentFrame();
  const end = SEC.open.to;

  // --- Scroll-Doubletake, synchron zu "okay, okay, okay"
  const o0 = ws("L01", 0), o1 = ws("L01", 1), o2 = ws("L01", 2);
  const scroll =
    map(frame, [0, o1], [0, 520], E.inOutCubic) -
    map(frame, [o2 - 4, o2 + 14], [0, 520], E.outBack);

  // --- Cursor
  const cur0 = { x: 1500, y: 860 };
  const cur1 = { x: 1180, y: 420 };
  const cur2 = { x: tx + 250, y: ty + 150 };
  const c1 = prog(frame, 0, o1 - 2, E.inOutCubic);
  const c2 = prog(frame, o2 + 6, 26, E.outQuint);
  const cx = lerp(lerp(cur0.x, cur1.x, c1), cur2.x, c2);
  const cy = lerp(lerp(cur0.y, cur1.y, c1), cur2.y, c2);

  const hover = prog(frame, o2 + 26, 10, E.outCubic);
  const progress = map(frame, [o2 + 30, end], [0, 0.42]);

  // --- Kamera: View-Rect von voller Seite -> Thumbnail
  const wasF = ws("L02", 0);
  const dennF = ws("L02", 3);
  const crashStart = Math.max(dennF + 8, end - 40);
  const punch1 = prog(frame, wasF - 2, 7, E.outExpo) * 0.16;
  const punch2 = prog(frame, dennF - 2, 7, E.outExpo) * 0.17;
  const crash = prog(frame, crashStart, end - crashStart, E.inExpo);
  const t = Math.min(1, punch1 + punch2 + crash * (1 - punch1 - punch2));

  const targetW = CARD_W;
  const vw = Math.exp(lerp(Math.log(W), Math.log(targetW), t));
  const k = (W - vw) / (W - targetW);
  const cxv = lerp(W / 2, tx + CARD_W / 2, k);
  const cyv = lerp(H / 2, ty + THUMB_H / 2, k);
  const S = W / vw;
  const vh = vw * (9 / 16);
  const Tx = -(cxv - vw / 2) * S;
  const Ty = -(cyv - vh / 2) * S;

  const sh = shake(frame, impulse(frame, [{ at: wasF, amp: 0.35, decay: 6 }, { at: dennF, amp: 0.5, decay: 7 }]), "s1");
  const ca = impulse(frame, [{ at: wasF, amp: 10, decay: 5 }, { at: dennF, amp: 14, decay: 5 }]) + crash * 26;

  // Einblendung aus Schwarz
  const fadeIn = prog(frame, 0, 10);

  const inner = (
    <AbsoluteFill
      style={{
        transformOrigin: "0 0",
        transform: `translate(${Tx + sh.x}px, ${Ty + sh.y}px) scale(${S}) rotate(${sh.r * 0.3}deg)`,
      }}
    >
      <Page scroll={scroll} hover={hover * (1 - crash)} progress={progress} />
      <Cursor x={cx} y={cy + 0} />
    </AbsoluteFill>
  );

  return (
    <AbsoluteFill style={{ background: "#000", opacity: fadeIn }}>
      <Chroma amount={ca}>
        {frame >= crashStart - 2 ? (
          <CameraMotionBlur samples={7} shutterAngle={240}>
            {inner}
          </CameraMotionBlur>
        ) : (
          inner
        )}
      </Chroma>
      {/* leichtes Monitor-Gefühl: Vignette steigt mit Zoom */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
          opacity: 0.4 + t * 0.6,
        }}
      />
      {/* Untertitel-Gag: L01 als echtes YouTube-Untertitel-Overlay */}
      {frame >= ls("L01") && frame < we("L01", 2) + 10 && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 70,
            transform: "translateX(-50%)",
            background: "rgba(8,8,8,0.75)",
            color: "#fff",
            fontFamily: "Roboto",
            fontSize: 36,
            padding: "6px 14px",
          }}
        >
          {["okay,", " okay,", " okay…"].slice(0, frame >= o2 ? 3 : frame >= o1 ? 2 : frame >= o0 ? 1 : 0).join("")}
        </div>
      )}
    </AbsoluteFill>
  );
};
