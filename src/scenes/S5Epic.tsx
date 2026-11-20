import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { BY_VIEWS, CHANNEL, thumb } from "../data/channel";
import { E, map, prog, impulse, shake, lerp, W, H, rand } from "../lib";
import { SEC, ws, we, ls, le } from "../timeline";
import { Chroma, Flash, Grain, Letterbox, Vignette } from "../components/fx";
import { F } from "../fonts";

// 0:25 – 0:34  Trailer-Teil: 3D-Karussell aller 14 echten Thumbnails,
// "Von unmöglichen Strategien … bis zu den verrücktesten SMP-Geschichten …"
// "Das ist … REVANCHIE."

const IDS = BY_VIEWS.map((v) => v.id);
const PANEL_W = 760;
const PANEL_H = 428;
const STEP = 360 / IDS.length;
const R = (IDS.length * (PANEL_W + 70)) / (2 * Math.PI);

const Carousel: React.FC<{ rot: number; dist: number; tiltX: number; y: number }> = ({ rot, dist, tiltX, y }) => (
  <AbsoluteFill style={{ perspective: 1500, perspectiveOrigin: "50% 42%" }}>
    <div
      style={{
        position: "absolute",
        left: W / 2,
        top: H / 2 + y,
        transformStyle: "preserve-3d",
        transform: `translateZ(${-dist}px) rotateX(${tiltX}deg) rotateY(${rot}deg)`,
      }}
    >
      {IDS.map((id, i) => (
        <div
          key={id}
          style={{
            position: "absolute",
            left: -PANEL_W / 2,
            top: -PANEL_H / 2,
            width: PANEL_W,
            height: PANEL_H,
            transform: `rotateY(${i * STEP}deg) translateZ(${R}px)`,
            backfaceVisibility: "hidden",
            WebkitBoxReflect: "below 26px linear-gradient(transparent 55%, rgba(255,255,255,0.22))",
          } as React.CSSProperties}
        >
          <Img src={staticFile(thumb(id))} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

const Pixels: React.FC<{ t: number }> = ({ t }) => (
  <>
    {Array.from({ length: 70 }).map((_, i) => {
      const a = rand(i) * Math.PI * 2;
      const sp = 14 + rand(i + 50) * 34;
      const x = W / 2 + Math.cos(a) * sp * t;
      const y = H / 2 + Math.sin(a) * sp * t * 0.8 + 0.35 * t * t;
      const s = 10 + rand(i + 9) * 26;
      const col = ["#8b3dff", "#c9a2ff", "#ffffff", "#5a17c9"][i % 4];
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: s,
            height: s,
            background: col,
            opacity: Math.max(0, 1 - t / 70),
            transform: `rotate(${t * (rand(i + 3) - 0.5) * 20}deg)`,
          }}
        />
      );
    })}
  </>
);

export const S5Epic: React.FC = () => {
  const frame = useCurrentFrame();
  const s0 = SEC.epic.from;
  const t = frame - s0;
  const dasIst = ls("L12");
  const logo = ws("L13", 0);

  // Kamera: Start ganz nah an einem Panel, dann gewaltiger Pull-Back
  const pull = E.outExpo(Math.min(1, t / 70));
  const dist = lerp(R - 560, R + 420, pull) + map(frame, [dasIst - 30, logo], [0, -700], E.inCubic);
  const rot = -t * 0.32 - (1 - pull) * 30;
  const tiltX = lerp(0, -6, pull);
  const dim = map(frame, [dasIst - 20, dasIst + 10], [1, 0.18]);

  const imp = impulse(frame, [
    { at: s0, amp: 0.9, decay: 18 },
    { at: logo, amp: 1.5, decay: 18 },
  ]);
  const sh = shake(frame, imp, "s5", 0.7);

  // L11 Wörter, kinoartig eingeblendet
  const line11 = ["VON", "UNMÖGLICHEN", "STRATEGIEN", "…", "BIS", "ZU", "DEN", "VERRÜCKTESTEN", "SMP-GESCHICHTEN"];
  const w11 = (i: number) => {
    // "…" hat kein gesprochenes Wort
    const map11 = [0, 1, 2, 2, 3, 4, 5, 6, 7];
    return ws("L11", map11[i]) + (i === 3 ? 10 : 0);
  };
  const row1 = line11.slice(0, 4);
  const row2 = line11.slice(4);
  const l11Out = prog(frame, le("L11") + 8, 14);

  const afterLogo = frame >= logo;
  const lt = frame - logo;

  return (
    <AbsoluteFill style={{ background: "#030107", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r * 0.5}deg)`,
          filter: afterLogo ? `blur(${map(lt, [0, 14], [0, 14])}px) brightness(${map(lt, [0, 14], [1.6, 0.35])})` : `brightness(${dim})`,
        }}
      >
        {t < 26 ? (
          <CameraMotionBlur samples={6} shutterAngle={200}>
            <Carousel rot={rot} dist={dist} tiltX={tiltX} y={-90} />
          </CameraMotionBlur>
        ) : (
          <Carousel rot={rot} dist={dist} tiltX={tiltX} y={-90} />
        )}
        {/* Licht-Sweep */}
        <AbsoluteFill
          style={{
            background: `linear-gradient(100deg, transparent ${map(t, [0, 300], [-20, 120]) - 12}%, rgba(200,160,255,0.16) ${map(t, [0, 300], [-20, 120])}%, transparent ${map(t, [0, 300], [-20, 120]) + 12}%)`,
          }}
        />
      </AbsoluteFill>

      <Vignette strength={0.85} />

      {/* Kinotext */}
      {!afterLogo && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 170, textAlign: "center", fontFamily: F.cine, color: "#fff", opacity: 1 - l11Out }}>
          {[row1, row2].map((row, r) => (
            <div key={r} style={{ fontSize: r === 0 ? 46 : 58, fontWeight: r === 0 ? 300 : 600, letterSpacing: r === 0 ? 18 : 12, marginTop: r ? 14 : 0 }}>
              {row.map((w, i) => {
                const idx = r === 0 ? i : i + 4;
                const k = prog(frame, w11(idx) - 2, 14, E.outCubic);
                return (
                  <span key={i} style={{ display: "inline-block", marginRight: 22, opacity: k, transform: `translateY(${(1 - k) * 18}px)`, filter: `blur(${(1 - k) * 8}px)`, color: w === "VERRÜCKTESTEN" ? "#c9a2ff" : "#fff" }}>
                    {w}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* "Das ist …" */}
      {frame >= dasIst && !afterLogo && (
        <div style={{ position: "absolute", left: 0, right: 0, top: H / 2 - 40, textAlign: "center", fontFamily: F.cine, fontWeight: 300, fontSize: 64, letterSpacing: 30, color: "#fff", opacity: prog(frame, dasIst, 8) }}>
          DAS IST
        </div>
      )}

      {afterLogo && (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, rgba(139,61,255,${0.55 * Math.exp(-lt / 40) + 0.18}) 0%, transparent 60%)` }} />
          <Pixels t={lt} />
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", transform: `translate(${sh.x * 0.6}px, ${sh.y * 0.6}px) scale(${1 + lt * 0.0012})` }}>
            <Img
              src={staticFile(CHANNEL.avatar)}
              style={{
                width: 270,
                height: 270,
                borderRadius: 135,
                border: "10px solid #fff",
                marginBottom: 26,
                transform: `scale(${lerp(3, 1, E.outExpo(Math.min(1, lt / 10)))})`,
                opacity: Math.min(1, lt / 3),
              }}
            />
            <div style={{ fontFamily: F.display, fontSize: 250, color: "#fff", letterSpacing: 14, lineHeight: 1, display: "flex" }}>
              {"REVANCHIE".split("").map((c, i) => {
                const k = Math.min(1, Math.max(0, (lt - i * 1.5) / 6));
                return (
                  <span key={i} style={{ display: "inline-block", opacity: k > 0 ? 1 : 0, transform: `scale(${lerp(2.4, 1, E.outExpo(k))}) translateY(${(1 - E.outExpo(k)) * -40}px)`, textShadow: "12px 12px 0 #7a1fff" }}>
                    {c}
                  </span>
                );
              })}
            </div>
            <div style={{ fontFamily: F.cine, fontWeight: 600, fontSize: 30, letterSpacing: 22, color: "#d9c4ff", marginTop: 20, opacity: prog(frame, logo + 18, 12) }}>
              MINECRAFT · SMP · PVP
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}

      <Letterbox amount={map(t, [0, 16], [0, 1], E.outCubic) * (afterLogo ? map(lt, [0, 10], [1, 0]) : 1)} />
      <Grain opacity={0.09} />
      <Flash opacity={impulse(frame, [{ at: s0, amp: 0.8, decay: 5 }, { at: logo, amp: 1, decay: 6 }])} />
    </AbsoluteFill>
  );
};
