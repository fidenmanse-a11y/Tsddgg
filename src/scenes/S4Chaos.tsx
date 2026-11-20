import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { thumb, VIDEOS } from "../data/channel";
import { E, map, prog, impulse, shake, lerp, W, H, rand } from "../lib";
import { SEC, ws, we, ls, le } from "../timeline";
import { Chroma, Flash, Glitch, Vignette } from "../components/fx";
import { F } from "../fonts";

// 0:17 – 0:25  3D-Tunnel aus echten Thumbnails, Schnitte immer schneller.
// "HAHAHA! NEIN, NEIN, NEIN, NEIN!" · "WIE KANN DAS BITTE FUNKTIONIEREN?!"

const POOL = ["QJw0v8rWq90", "cqVsmIshzLc", "0c5uPCQwZO0", "Rfj5lAsYpZs", "tS_BQ12nfjk", "2oXza_81aYY", "gtwiE_Cul84", "ZaLb3fu6j-Y", "veJacP4gTIU", "Eq2_E58U2S8", "WaBZP5Uy2nA", "rAa4f9RQCP8", "QPQtvx-q1eo", "rbj0AadIZtE"];
const N = 28;
const SPACING = 760;
const DEPTH = N * SPACING;

const Tunnel: React.FC<{ camZ: number; roll: number }> = ({ camZ, roll }) => (
  <AbsoluteFill style={{ perspective: 1000, perspectiveOrigin: "50% 50%" }}>
    <AbsoluteFill style={{ transformStyle: "preserve-3d", transform: `rotateZ(${roll}deg)` }}>
      {Array.from({ length: N }).map((_, i) => {
        const ang = i * 2.399;
        const R = 820 + rand(i) * 260;
        const x = Math.cos(ang) * R;
        const y = Math.sin(ang) * R * 0.62;
        let z = (((-i * SPACING + camZ) % DEPTH) + DEPTH) % DEPTH; // 0..DEPTH
        z = z - DEPTH + 600; // -DEPTH+600 .. 600
        const fog = Math.min(1, Math.max(0, (z + DEPTH - 1200) / 6000));
        if (z > 560) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: W / 2 - 330,
              top: H / 2 - 186,
              width: 660,
              height: 372,
              transform: `translate3d(${x}px, ${y}px, ${z}px) rotateY(${-x / 40}deg) rotateX(${y / 40}deg)`,
              opacity: fog,
            }}
          >
            <Img src={staticFile(thumb(POOL[i % POOL.length]))} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} />
          </div>
        );
      })}
    </AbsoluteFill>
  </AbsoluteFill>
);

const speedAt = (f: number, accelFrom: number, accelTo: number) => {
  const base = 70;
  const ramp = map(f, [accelFrom, accelTo], [0, 1], E.inCubic);
  return base + ramp * 620;
};

export const S4Chaos: React.FC = () => {
  const frame = useCurrentFrame();
  const s0 = SEC.chaos.from;
  const neins = [1, 2, 3, 4].map((i) => ws("L09", i));
  const l10 = ls("L10");
  const funk = ws("L10", 4);
  const funkEnd = le("L10");
  // exakt eine halbe Sekunde absolute Stille vor dem Trailer-Teil
  const blackout = Math.max(funkEnd + 6, SEC.chaos.to - 30);

  // Kamera-Position = Integral der Geschwindigkeit (Speed-Ramp)
  let camZ = 0;
  const fi = Math.floor(frame);
  for (let f = s0; f < fi; f++) camZ += speedAt(f, l10, funk);
  camZ += (frame - fi) * speedAt(fi, l10, funk);
  const roll = (frame - s0) * 0.35 + map(frame, [l10, funk], [0, 70], E.inCubic);

  const imp = impulse(frame, [
    { at: s0, amp: 0.7, decay: 10 },
    ...neins.map((n, i) => ({ at: n, amp: 0.4 + i * 0.15, decay: 6 })),
    ...[0, 1, 2, 3].map((i) => ({ at: ws("L10", i), amp: 0.25, decay: 5 })),
    { at: funk, amp: 1.3, decay: 14 },
  ]);
  const sh = shake(frame, Math.min(1.6, imp), "s4");
  const ca = impulse(frame, [...neins.map((n) => ({ at: n, amp: 12, decay: 5 })), { at: funk, amp: 28, decay: 12 }]) + map(frame, [l10, funk], [0, 18]);

  // Freeze-Frame auf "FUNKTIONIEREN"
  if (frame >= funk) {
    const t = frame - funk;
    const v = VIDEOS.rbj0AadIZtE;
    if (frame >= blackout) {
      // Plötzliche Stille: nur Schwarz
      return <AbsoluteFill style={{ background: "#000" }} />;
    }
    return (
      <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
        <Chroma amount={ca}>
          <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) scale(${1.06 + t * 0.0012})` }}>
            <Glitch active={t < 10 || (t > 22 && t < 27)} intensity={1.3} seed={3}>
              <Img src={staticFile(thumb(v.id))} style={{ width: W, height: H, objectFit: "cover", filter: `saturate(${t < 3 ? 0 : 1.15}) contrast(1.1)` }} />
            </Glitch>
            {/* roter Thumbnail-Kreis um das Item */}
            <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
              <ellipse
                cx={W * 0.465}
                cy={H * 0.74}
                rx={240}
                ry={200}
                fill="none"
                stroke="#ff2a2a"
                strokeWidth={16}
                strokeDasharray={1500}
                strokeDashoffset={1500 * (1 - prog(frame, funk + 4, 12, E.outCubic))}
                transform={`rotate(-8 ${W * 0.465} ${H * 0.74})`}
              />
            </svg>
          </AbsoluteFill>
        </Chroma>
        <Vignette strength={0.6} />
        <div
          style={{
            position: "absolute",
            left: 80,
            top: 50,
            fontFamily: F.display,
            fontSize: 150,
            color: "#fff",
            lineHeight: 0.95,
            textShadow: "10px 10px 0 #7a1fff",
            transform: `scale(${lerp(1.3, 1, E.outExpo(Math.min(1, t / 8)))})`,
            transformOrigin: "0 0",
          }}
        >
          FUNKTIONIEREN?!
        </div>
        <div style={{ position: "absolute", left: 86, bottom: 60, fontFamily: F.yt, color: "#fff", opacity: prog(frame, funk + 10, 8) }}>
          <div style={{ fontSize: 40, fontWeight: 500 }}>{v.title}</div>
          <div style={{ fontSize: 30, color: "#ccc", marginTop: 6 }}>{v.views} Aufrufe • {v.published}</div>
        </div>
        <Flash opacity={impulse(frame, [{ at: funk, amp: 0.9, decay: 3 }])} />
      </AbsoluteFill>
    );
  }

  // HAHAHA – springende Buchstaben
  const haS = ws("L09", 0);
  const haE = we("L09", 0);
  const showHa = frame >= haS - 2 && frame < neins[0];
  const HA = "HAHAHAHA";

  // NEIN-Slams: jeder bleibt liegen, der Stapel wächst
  const slams = neins.map((n, i) => ({ at: n, id: ["WaBZP5Uy2nA", "rbj0AadIZtE", "QJw0v8rWq90", "0c5uPCQwZO0"][i], rot: [-9, 7, -5, 11][i], sx: [-300, 280, -180, 120][i], sy: [-60, 40, 90, -30][i] }));
  const activeSlams = frame < l10 ? slams.filter((s) => frame >= s.at - 1) : [];
  const lastNein = activeSlams.length - 1;

  // Worte von L10
  let w10 = -1;
  for (let i = 0; i < 4; i++) if (frame >= ws("L10", i) - 1) w10 = i;
  const w10Text = ["WIE", "KANN", "DAS", "BITTE"][w10] ?? "";

  const blurSamples = frame >= l10 ? 8 : 5;

  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at center, #2a0b55 0%, #07020f 70%)", overflow: "hidden" }}>
      <Chroma amount={ca} angle={roll / 57}>
        <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg)` }}>
          <CameraMotionBlur samples={blurSamples} shutterAngle={frame >= l10 ? 300 : 180}>
            <Tunnel camZ={camZ} roll={roll} />
          </CameraMotionBlur>

          {activeSlams.map((s, i) => {
            const t = frame - s.at;
            const k = E.outExpo(Math.min(1, t / 6));
            const dim = i < lastNein ? 0.55 : 1;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: W / 2 - 560 + s.sx * 0.6,
                  top: H / 2 - 315 + s.sy,
                  width: 1120,
                  height: 630,
                  transform: `scale(${lerp(2.6, 1, k)}) rotate(${s.rot}deg)`,
                  filter: `brightness(${dim})`,
                  boxShadow: "0 40px 90px rgba(0,0,0,0.7)",
                  border: "8px solid #fff",
                }}
              >
                <Img src={staticFile(thumb(s.id))} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            );
          })}
        </AbsoluteFill>
      </Chroma>

      {showHa && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center", fontFamily: F.display, fontSize: 250, color: "#fff", letterSpacing: 6 }}>
          {HA.split("").map((c, i) => {
            const appear = haS + ((haE - haS) * i) / HA.length;
            const on = frame >= appear;
            const jump = Math.abs(Math.sin((frame - appear) / 4 + i)) * 50;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: on ? 1 : 0,
                  transform: `translateY(${-jump}px) rotate(${Math.sin(frame / 5 + i) * 8}deg)`,
                  color: i % 2 ? "#d7b8ff" : "#fff",
                  textShadow: "8px 8px 0 #3b0f8a",
                }}
              >
                {c}
              </span>
            );
          })}
        </div>
      )}

      {lastNein >= 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: [430, 400, 360, 300][lastNein],
            textAlign: "center",
            fontFamily: F.display,
            fontSize: [190, 240, 300, 400][lastNein],
            color: ["#fff", "#fff", "#e4ccff", "#ff4d6d"][lastNein],
            transform: `rotate(${[-6, 5, -4, 3][lastNein]}deg) scale(${lerp(1.6, 1, E.outExpo(Math.min(1, (frame - neins[lastNein]) / 6)))})`,
            textShadow: "12px 12px 0 #1a0638",
          }}
        >
          {"NEIN" + "!".repeat(lastNein + 1)}
        </div>
      )}

      {w10 >= 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 380,
            textAlign: "center",
            fontFamily: F.display,
            fontSize: 260,
            color: "#fff",
            transform: `scale(${lerp(1.5, 1, E.outExpo(Math.min(1, (frame - ws("L10", w10)) / 6)))})`,
            textShadow: "12px 12px 0 #1a0638",
          }}
        >
          {w10Text}
        </div>
      )}
      <Vignette strength={0.5} />
      <Flash opacity={impulse(frame, [{ at: s0, amp: 0.6, decay: 4 }, ...neins.map((n) => ({ at: n, amp: 0.25, decay: 3 }))])} />
    </AbsoluteFill>
  );
};
