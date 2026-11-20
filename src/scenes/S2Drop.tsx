import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { CHANNEL, thumb, VIDEOS } from "../data/channel";
import { E, map, prog, impulse, shake, rand, W, H, lerp } from "../lib";
import { SEC, ws, we, ls, le } from "../timeline";
import { Chroma, Flash, Glitch, Vignette } from "../components/fx";
import { F } from "../fonts";

// 0:04 – 0:10  DROP · "Dieser Typ spielt Minecraft nicht einfach nur …"
//              "DER MACHT AUS JEDEM SERVER EIN KOMPLETTES CHAOS!"

const Full: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img src={staticFile(src)} style={{ position: "absolute", width: W, height: H, objectFit: "cover", ...style }} />
);

const BigWord: React.FC<{ text: string; t: number; color?: string; size?: number; x?: number; y?: number; align?: "left" | "center" }> = ({
  text,
  t,
  color = "#fff",
  size = 230,
  x = 90,
  y = 690,
  align = "left",
}) => {
  const s = lerp(1.35, 1, E.outExpo(t));
  return (
    <div
      style={{
        position: "absolute",
        left: align === "center" ? 0 : x,
        right: align === "center" ? 0 : undefined,
        top: y,
        textAlign: align,
        fontFamily: F.display,
        fontSize: size,
        lineHeight: 0.9,
        color,
        letterSpacing: 2,
        transform: `scale(${s})`,
        transformOrigin: align === "center" ? "50% 50%" : "0% 100%",
        opacity: Math.min(1, t * 4),
        textShadow: "0 10px 0 rgba(0,0,0,0.35), 10px 10px 0 #2a0a5e",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};

/** Pfeil wie aus einem YouTube-Thumbnail (handgezeichnet) */
const Arrow: React.FC<{ t: number }> = ({ t }) => (
  <svg
    width="420"
    height="300"
    viewBox="0 0 420 300"
    style={{ position: "absolute", left: 1220, top: 520, transform: `rotate(${-8 + Math.sin(t * 20) * 2}deg) scale(${E.outBack(Math.min(1, t * 3))})` }}
  >
    <path d="M400 260 C 300 240, 200 200, 90 70" stroke="#ff2a2a" strokeWidth="34" fill="none" strokeLinecap="round" />
    <path d="M60 40 L 175 70 L 95 150 Z" fill="#ff2a2a" />
  </svg>
);

const SHOTS = ["0c5uPCQwZO0", "AVATAR", "QPQtvx-q1eo", "cqVsmIshzLc", "gtwiE_Cul84"];
const GRID_POOL = ["tS_BQ12nfjk", "2oXza_81aYY", "Rfj5lAsYpZs", "QJw0v8rWq90", "Eq2_E58U2S8", "ZaLb3fu6j-Y", "veJacP4gTIU", "rbj0AadIZtE", "0c5uPCQwZO0", "cqVsmIshzLc", "gtwiE_Cul84", "WaBZP5Uy2nA", "rAa4f9RQCP8", "QPQtvx-q1eo", "Rfj5lAsYpZs", "tS_BQ12nfjk"];

export const S2Drop: React.FC = () => {
  const frame = useCurrentFrame();
  const d0 = SEC.drop.from;
  const l3 = ls("L03");
  const l4 = ls("L04");
  const chaos = ws("L04", 7);

  const hits = [
    { at: d0, amp: 1.25, decay: 12 },
    ...[0, 1, 2, 3].map((i) => ({ at: ws("L03", i), amp: 0.32, decay: 6 })),
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => ({ at: ws("L04", i), amp: 0.22, decay: 5 })),
    { at: chaos, amp: 1.6, decay: 16 },
  ];
  const imp = impulse(frame, hits);
  const sh = shake(frame, Math.min(imp, 1.8), "s2");
  const flash = impulse(frame, [{ at: d0, amp: 0.95, decay: 3 }, { at: chaos, amp: 1, decay: 4 }]);
  const ca = impulse(frame, [{ at: d0, amp: 22, decay: 8 }, { at: chaos, amp: 30, decay: 10 }]) + imp * 4;

  let content: React.ReactNode = null;

  if (frame < l3) {
    // ---- DROP: das Thumbnail, in das wir gerade gecrasht sind
    const t = frame - d0;
    const s = lerp(1.28, 1.0, E.outExpo(Math.min(1, t / 22))) + t * 0.0008;
    const v = VIDEOS.WaBZP5Uy2nA;
    const words = v.title.toUpperCase().replace("…", "").split(" ");
    content = (
      <AbsoluteFill>
        <Full src={thumb(v.id)} style={{ transform: `scale(${s})` }} />
        <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(10,0,25,0.85) 0%, transparent 55%)" }} />
        <div style={{ position: "absolute", left: 90, bottom: 80, fontFamily: F.display, fontSize: 132, color: "#fff", lineHeight: 0.95 }}>
          {words.map((w, i) => {
            const wt = prog(frame, d0 + 4 + i * 4, 8, E.outExpo);
            return (
              <span key={i} style={{ display: "inline-block", marginRight: 30, transform: `translateY(${(1 - wt) * 80}px)`, opacity: wt, color: w === "HOLZSCHWERT" ? "#c99cff" : "#fff" }}>
                {w}
              </span>
            );
          })}
          <span style={{ opacity: prog(frame, d0 + 26, 6), color: "#c99cff" }}>…</span>
        </div>
        <div
          style={{
            position: "absolute",
            left: 96,
            bottom: 52,
            fontFamily: F.yt,
            fontSize: 30,
            color: "#ddd",
            opacity: prog(frame, d0 + 20, 8),
          }}
        >
          {v.views} Aufrufe • {v.published}
        </div>
      </AbsoluteFill>
    );
  } else if (frame < l4) {
    // ---- "Dieser Typ spielt Minecraft nicht einfach nur…"  (ein Schnitt pro Wort)
    let idx = 0;
    for (let i = 0; i < 7; i++) if (frame >= ws("L03", i) - 1) idx = i;
    const shot = Math.min(idx, 4);
    const sStart = ws("L03", shot) - 1;
    const t = frame - sStart;
    const label = ["DIESER", "TYP", "SPIELT", "MINECRAFT"][shot];

    if (shot === 0) {
      // Whip-Pan von rechts
      const x = lerp(W * 1.15, 0, E.outExpo(Math.min(1, t / 10)));
      content = (
        <CameraMotionBlur samples={6} shutterAngle={200}>
          <AbsoluteFill style={{ transform: `translateX(${x}px)` }}>
            <Full src={thumb(SHOTS[0])} style={{ transform: `scale(${1.1 + t * 0.002})` }} />
            <BigWord text={label} t={prog(frame, sStart + 2, 8)} />
          </AbsoluteFill>
        </CameraMotionBlur>
      );
    } else if (shot === 1) {
      // Avatar + Thumbnail-Pfeil = "DIESER TYP"
      const s = lerp(1.6, 1, E.outExpo(Math.min(1, t / 12)));
      content = (
        <AbsoluteFill style={{ background: "#14062e" }}>
          <Full src={CHANNEL.banner} style={{ filter: "blur(18px) brightness(0.55)", transform: "scale(1.2)" }} />
          <Img
            src={staticFile(CHANNEL.avatar)}
            style={{
              position: "absolute",
              left: W / 2 - 400,
              top: H / 2 - 400,
              width: 800,
              height: 800,
              borderRadius: 400,
              transform: `scale(${s}) rotate(${lerp(-14, 0, E.outBack(Math.min(1, t / 14)))}deg)`,
              border: "14px solid #fff",
              boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
            }}
          />
          <Arrow t={t / 60} />
          <BigWord text={label} t={prog(frame, sStart + 1, 8)} x={110} y={140} size={280} />
        </AbsoluteFill>
      );
    } else if (shot === 2) {
      // 3D-Drehung
      const ry = lerp(75, 0, E.outExpo(Math.min(1, t / 14)));
      content = (
        <AbsoluteFill style={{ perspective: 1400, background: "#000" }}>
          <AbsoluteFill style={{ transform: `rotateY(${ry}deg) scale(${1.05 + t * 0.002})`, transformOrigin: "0% 50%" }}>
            <Full src={thumb(SHOTS[2])} />
          </AbsoluteFill>
          <BigWord text={label} t={prog(frame, sStart + 2, 8)} x={1000} />
        </AbsoluteFill>
      );
    } else if (shot === 3) {
      // Zwei Hälften schließen sich
      const k = E.outExpo(Math.min(1, t / 10));
      content = (
        <AbsoluteFill style={{ background: "#000" }}>
          <AbsoluteFill style={{ clipPath: "inset(0 0 50% 0)", transform: `translateY(${-(1 - k) * 560}px)` }}>
            <Full src={thumb(SHOTS[3])} style={{ transform: `scale(${1.04 + t * 0.002})` }} />
          </AbsoluteFill>
          <AbsoluteFill style={{ clipPath: "inset(50% 0 0 0)", transform: `translateY(${(1 - k) * 560}px)` }}>
            <Full src={thumb(SHOTS[3])} style={{ transform: `scale(${1.04 + t * 0.002})` }} />
          </AbsoluteFill>
          <BigWord text={label} t={prog(frame, sStart + 3, 8)} align="center" y={380} size={260} />
        </AbsoluteFill>
      );
    } else {
      // "nicht einfach nur…" – Zeitlupe, Entsättigung, getippter Text
      const s0 = ws("L03", 4) - 1;
      const tt = frame - s0;
      const txt = "NICHT EINFACH NUR…";
      const total = Math.max(10, le("L03") - s0);
      const n = Math.floor(map(frame, [s0, s0 + total * 0.9], [0, txt.length]));
      content = (
        <AbsoluteFill style={{ background: "#000" }}>
          <Full
            src={thumb(SHOTS[4])}
            style={{
              transform: `scale(${1.02 + tt * 0.0016})`,
              filter: `saturate(${map(tt, [0, 60], [1, 0.35])}) brightness(${map(tt, [0, 60], [1, 0.6])})`,
            }}
          />
          <Vignette strength={0.8} />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 440,
              textAlign: "center",
              fontFamily: F.display,
              fontSize: 170,
              color: "#fff",
              letterSpacing: 4,
            }}
          >
            {txt.slice(0, n)}
            <span style={{ opacity: Math.floor(frame / 8) % 2 ? 1 : 0, color: "#b38aff" }}>|</span>
          </div>
        </AbsoluteFill>
      );
    }
  } else if (frame < chaos) {
    // ---- Teilungs-Raster: jedes Wort verdoppelt das Chaos
    let wi = 0;
    for (let i = 0; i < 7; i++) if (frame >= ws("L04", i) - 1) wi = i;
    const grids = [1, 2, 2, 4, 9, 9, 16];
    const n = grids[wi];
    const cols = n === 2 ? 2 : Math.round(Math.sqrt(n));
    const rows = n === 2 ? 1 : cols;
    const t = frame - (ws("L04", wi) - 1);
    const pop = E.outExpo(Math.min(1, t / 8));
    const words = ["DER", "MACHT", "AUS", "JEDEM", "SERVER", "EIN", "KOMPLETTES"];
    content = (
      <AbsoluteFill style={{ background: "#0a0414" }}>
        {Array.from({ length: n }).map((_, i) => {
          const c = i % cols;
          const r = Math.floor(i / cols);
          const id = GRID_POOL[(i * 5 + wi * 3) % GRID_POOL.length];
          const tw = W / cols;
          const th = H / rows;
          const delay = (i % 4) * 1.2;
          const pk = E.outBack(Math.min(1, Math.max(0, (t - delay) / 10)));
          return (
            <div key={i} style={{ position: "absolute", left: c * tw, top: r * th, width: tw, height: th, overflow: "hidden", padding: n > 1 ? 4 : 0 }}>
              <Img
                src={staticFile(thumb(id))}
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${lerp(1.4, 1, pk)})`, borderRadius: n > 1 ? 10 : 0 }}
              />
            </div>
          );
        })}
        <AbsoluteFill style={{ background: "rgba(10,3,24,0.35)" }} />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 330,
            textAlign: "center",
            fontFamily: F.display,
            fontSize: wi === 6 ? 250 : 300,
            color: wi % 2 ? "#cfa8ff" : "#fff",
            transform: `scale(${lerp(1.5, 1, pop)}) rotate(${(rand(wi) - 0.5) * 8}deg)`,
            textShadow: "0 14px 0 #1b0640",
          }}
        >
          {words[wi]}
        </div>
      </AbsoluteFill>
    );
  } else {
    // ---- CHAOS: das Raster explodiert in 3D auf die Kamera zu
    const t = frame - chaos;
    content = (
      <AbsoluteFill style={{ background: "#12001f" }}>
        <Img
          src={staticFile(thumb("QJw0v8rWq90"))}
          style={{ position: "absolute", width: W, height: H, objectFit: "cover", filter: "blur(22px) brightness(0.4) saturate(1.4)", transform: `scale(${1.15 + t * 0.002})` }}
        />
        {(() => {
          const tiles = (
          <AbsoluteFill style={{ perspective: 900 }}>
            {Array.from({ length: 16 }).map((_, i) => {
              const c = i % 4;
              const r = Math.floor(i / 4);
              const id = GRID_POOL[(i * 5 + 18) % GRID_POOL.length];
              const dx = (c - 1.5) * (0.6 + rand(i) * 0.8);
              const dy = (r - 1.5) * (0.6 + rand(i + 9) * 0.8);
              const k = 1 - Math.exp(-t / 24);
              const op = 1 - Math.min(1, Math.max(0, (k - 0.5) / 0.4));
              if (op <= 0.02) return null;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: c * 480,
                    top: r * 270,
                    width: 480,
                    height: 270,
                    padding: 4,
                    opacity: op,
                    // z bleibt deutlich vor der Perspektiv-Ebene (900px), sonst explodiert die Rasterisierung
                    transform: `translate3d(${dx * 1100 * k}px, ${dy * 800 * k}px, ${k * (120 + rand(i + 3) * 380)}px) rotateX(${(rand(i + 5) - 0.5) * 220 * k}deg) rotateY(${(rand(i + 7) - 0.5) * 260 * k}deg) rotateZ(${(rand(i + 1) - 0.5) * 120 * k}deg)`,
                  }}
                >
                  <Img src={staticFile(thumb(id))} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
                </div>
              );
            })}
          </AbsoluteFill>
          );
          // Motion Blur nur in der schnellen Phase – danach unnötig teuer
          return t < 14 ? (
            <CameraMotionBlur samples={6} shutterAngle={220}>
              {tiles}
            </CameraMotionBlur>
          ) : (
            tiles
          );
        })()}
        <Glitch active={t < 14 || (t > 30 && t < 36)} intensity={1.2} seed={7}>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <div
              style={{
                fontFamily: F.display,
                fontSize: 420,
                color: "#fff",
                letterSpacing: 10,
                transform: `scale(${lerp(2.2, 1, E.outExpo(Math.min(1, t / 10))) + t * 0.0015})`,
                textShadow: "16px 16px 0 #7a1fff, -6px -6px 0 #ff2bd6",
              }}
            >
              CHAOS!
            </div>
          </AbsoluteFill>
        </Glitch>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <Chroma amount={ca} angle={0.3}>
        <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg) scale(${1 + Math.min(imp, 1.5) * 0.03})` }}>
          {content}
        </AbsoluteFill>
      </Chroma>
      <Flash opacity={Math.min(1, flash)} />
    </AbsoluteFill>
  );
};
