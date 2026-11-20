import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Img, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { CHANNEL, VIDEOS, thumb } from "../data/channel";
import { E, clamp, lerp, rand, shake } from "../lib";
import { Chroma, Flash, Glitch, Grain, Vignette } from "../components/fx";
import { SubscribeButton } from "../components/youtube";
import { F, FONT_SPECS } from "../fonts";
import BEATS from "./beats.json";

// REVANCHIE – Phonk-Edit als YouTube Short (1080×1920, 60 fps).
// Alles hängt am Beat-Raster aus beats.json (eigener Beat oder erkannter Song).

export const SW = 1080;
export const SH = 1920;

const BT: number[] = BEATS.beats;
const DROP = BEATS.dropBeat;
const A1 = DROP + 12; // Drop-Teil: 1 Schnitt pro Beat
const S1 = DROP + 20; // ruhiger Teil: 1 Schnitt pro 2 Beats
const R1 = DROP + 28; // Schnellteil: 1 Schnitt pro halbem Beat
const O0 = R1; // Endcard

/** Frame von (auch gebrochenem) Beat-Index */
const bf = (i: number) => {
  const k = Math.max(0, Math.min(BT.length - 2, Math.floor(i)));
  return BT[k] + (BT[k + 1] - BT[k]) * (i - k);
};
/** Beat-Index (gebrochen) eines Frames */
const beatAt = (f: number) => {
  for (let k = 0; k < BT.length - 1; k++) if (f < BT[k + 1]) return k + (f - BT[k]) / (BT[k + 1] - BT[k]);
  return BT.length - 1;
};

const SEQ_A = ["Rfj5lAsYpZs", "0c5uPCQwZO0", "QJw0v8rWq90", "WaBZP5Uy2nA", "cqVsmIshzLc", "Eq2_E58U2S8", "tS_BQ12nfjk", "2oXza_81aYY", "gtwiE_Cul84", "rbj0AadIZtE", "ZaLb3fu6j-Y", "veJacP4gTIU"];
const SEQ_S = ["rAa4f9RQCP8", "QPQtvx-q1eo", "Rfj5lAsYpZs", "QJw0v8rWq90"];
const SEQ_R = ["0c5uPCQwZO0", "WaBZP5Uy2nA", "cqVsmIshzLc", "Eq2_E58U2S8", "tS_BQ12nfjk", "2oXza_81aYY", "gtwiE_Cul84", "rbj0AadIZtE", "ZaLb3fu6j-Y", "veJacP4gTIU", "rAa4f9RQCP8", "QPQtvx-q1eo", "QJw0v8rWq90", "Rfj5lAsYpZs", "WaBZP5Uy2nA", "0c5uPCQwZO0"];

type Shot = { id: string; from: number; to: number; kind: "card" | "full"; trans: "cut" | "whip" | "zoom" | "spin" | "glitch"; sect: "A" | "S" | "R" };

const SHOTS: Shot[] = (() => {
  const out: Shot[] = [];
  const tA: Shot["trans"][] = ["cut", "whip", "zoom", "spin", "glitch", "whip"];
  SEQ_A.forEach((id, i) => out.push({ id, from: DROP + i, to: DROP + i + 1, kind: i % 2 ? "full" : "card", trans: i === 0 ? "cut" : tA[i % tA.length], sect: "A" }));
  SEQ_S.forEach((id, i) => out.push({ id, from: A1 + i * 2, to: A1 + i * 2 + 2, kind: "card", trans: "zoom", sect: "S" }));
  SEQ_R.forEach((id, i) => out.push({ id, from: S1 + i * 0.5, to: S1 + i * 0.5 + 0.5, kind: "full", trans: i % 4 === 3 ? "glitch" : "cut", sect: "R" }));
  return out;
})();

/** Text im Shorts-Untertitel-Look (Kontur statt Glow) */
const Caption: React.FC<{ text: string; size?: number; y?: number; t?: number; color?: string }> = ({ text, size = 120, y = 1240, t = 1, color = "#fff" }) => (
  <div
    style={{
      position: "absolute",
      left: 60,
      right: 60,
      top: y,
      textAlign: "center",
      fontFamily: F.display,
      fontSize: size,
      lineHeight: 1,
      color,
      WebkitTextStroke: `${Math.round(size / 11)}px #000`,
      paintOrder: "stroke fill",
      transform: `scale(${lerp(1.35, 1, E.outExpo(clamp(t)))})`,
      opacity: clamp(t * 3),
      letterSpacing: 1,
    }}
  >
    {text}
  </div>
);

const Background: React.FC<{ id: string; dim?: number; gray?: number }> = ({ id, dim = 0.45, gray = 0 }) => (
  <AbsoluteFill>
    <Img
      src={staticFile(thumb(id))}
      style={{ width: SW, height: SH, objectFit: "cover", filter: `blur(38px) brightness(${dim}) saturate(${1.3 - gray}) grayscale(${gray})`, transform: "scale(1.2)" }}
    />
  </AbsoluteFill>
);

const ShotView: React.FC<{ s: Shot; f: number }> = ({ s, f }) => {
  const start = bf(s.from);
  const end = bf(s.to);
  const age = f - start;
  const len = end - start;
  const p = clamp(age / len);
  // Eintritt
  let enter = "";
  if (s.trans === "whip") enter = `translateY(${lerp(SH * 0.9, 0, E.outExpo(clamp(age / 9)))}px)`;
  if (s.trans === "zoom") enter = `scale(${lerp(0.72, 1, E.outExpo(clamp(age / 10)))})`;
  if (s.trans === "spin") enter = `rotate(${lerp(-14, 0, E.outBack(clamp(age / 12)))}deg) scale(${lerp(1.25, 1, E.outExpo(clamp(age / 12)))})`;
  // Phonk-"Velocity": langsamer Drift, der auf dem nächsten Beat einrastet
  const drift = s.sect === "S" ? 1 + p * 0.06 : 1 + p * 0.035;

  const v = VIDEOS[s.id];
  const card = (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          width: 1000,
          height: 562,
          borderRadius: 28,
          overflow: "hidden",
          boxShadow: "0 40px 90px rgba(0,0,0,0.7)",
          transform:
            s.sect === "S"
              ? `perspective(1600px) rotateY(${Math.sin((f - start) / 26) * 16}deg) rotateX(${6 + Math.sin((f - start) / 40) * 3}deg) translateY(-90px) scale(${drift})`
              : `translateY(-90px) scale(${drift})`,
        }}
      >
        <Img src={staticFile(thumb(s.id))} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </AbsoluteFill>
  );
  const full = (
    <AbsoluteFill style={{ transform: `scale(${drift})` }}>
      <Img src={staticFile(thumb(s.id))} style={{ width: SW, height: SH, objectFit: "cover" }} />
    </AbsoluteFill>
  );

  const body = (
    <AbsoluteFill style={{ transform: enter }}>
      {s.kind === "card" && <Background id={s.id} />}
      {s.kind === "card" ? card : full}
      {s.sect !== "R" && (
        <div
          style={{
            position: "absolute",
            left: 70,
            right: 70,
            top: s.kind === "card" ? 1260 : 1300,
            textAlign: "center",
            fontFamily: F.yt,
            fontWeight: 700,
            fontSize: 44,
            color: "#fff",
            textShadow: "0 3px 14px rgba(0,0,0,0.9)",
            opacity: clamp((age - 2) / 6),
          }}
        >
          {v.title}
          <div style={{ fontWeight: 500, fontSize: 36, color: "#ddd", marginTop: 10 }}>{v.views} Aufrufe</div>
        </div>
      )}
    </AbsoluteFill>
  );

  if (s.trans === "whip" && age < 10) {
    return (
      <CameraMotionBlur samples={6} shutterAngle={220}>
        {body}
      </CameraMotionBlur>
    );
  }
  if (s.trans === "glitch" && age < 5) {
    return (
      <Glitch active intensity={1.1} seed={Math.round(start)}>
        {body}
      </Glitch>
    );
  }
  return body;
};

export const Short: React.FC = () => {
  const f = useCurrentFrame();
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(FONT_SPECS.map((s) => document.fonts.load(s)))
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);

  const b = beatAt(f);
  const bi = Math.floor(b);
  const sinceBeat = f - bf(bi);
  const inMain = b >= DROP && b < O0;

  // Punch auf jedem Beat, stärker auf der Eins, RGB-Split auf der Snare (3. Beat im Takt)
  const isOne = (bi - DROP) % 4 === 0;
  const isSnare = (bi - DROP) % 4 === 2;
  const slow = b >= A1 && b < S1;
  const punchAmp = inMain ? (slow ? 0.025 : isOne ? 0.11 : 0.06) : 0;
  const punch = 1 + punchAmp * Math.exp(-sinceBeat / 7);
  const shakeAmt = inMain && !slow ? (isOne ? 0.55 : 0.25) * Math.exp(-sinceBeat / 6) : 0;
  const sh = shake(f, shakeAmt + (b >= DROP && b < DROP + 1 ? 0.8 * Math.exp(-(f - bf(DROP)) / 10) : 0), "short");
  const ca = inMain && isSnare && !slow ? 16 * Math.exp(-sinceBeat / 5) : 0;
  const flash = Math.max(
    b >= DROP ? Math.exp(-(f - bf(DROP)) / 4) : 0,
    b >= O0 ? 0.8 * Math.exp(-(f - bf(O0)) / 4) : 0,
    b >= S1 && b < O0 && (f - bf(Math.floor(b * 2) / 2)) < 2 && Math.floor(b * 2) % 2 === 0 ? 0.25 : 0,
  );

  let scene: React.ReactNode;

  if (b < DROP) {
    // ---- INTRO: Schwarzweiß, Korn, langsamer Push. Untertitel zur Stimme.
    const t = f / bf(DROP);
    const [v0, v1] = BEATS.introVo;
    const vt = (f - v0) / (v1 - v0);
    const flicker = 0.85 + 0.15 * rand(Math.floor(f / 3));
    scene = (
      <AbsoluteFill style={{ background: "#000" }}>
        <AbsoluteFill style={{ filter: `grayscale(1) contrast(1.25) brightness(${0.75 * flicker})` }}>
          <Background id="WaBZP5Uy2nA" dim={0.35} gray={1} />
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <div style={{ width: 1000, height: 562, borderRadius: 28, overflow: "hidden", transform: `translateY(-90px) scale(${0.9 + Math.pow(t, 3) * 0.55})` }}>
              <Img src={staticFile(thumb("WaBZP5Uy2nA"))} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
        {vt > -0.05 && f < BEATS.introSplit - 2 && <Caption text="OKAY…" t={(f - v0) / 8} size={110} />}
        {f >= BEATS.introSplit - 2 && <Caption text="WAS IST DAS?!" t={(f - BEATS.introSplit + 2) / 8} size={130} color="#e9d6ff" />}
        <Grain opacity={0.16} />
        <Vignette strength={0.85} />
      </AbsoluteFill>
    );
  } else if (b < O0) {
    // ---- Haupt-Edit
    const cur = [...SHOTS].reverse().find((s) => b >= s.from) ?? SHOTS[0];
    const dropT = f - bf(DROP);
    scene = (
      <AbsoluteFill style={{ background: "#000" }}>
        <ShotView s={cur} f={f} />
        {b < DROP + 1.5 && (
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <div
              style={{
                fontFamily: F.display,
                fontSize: 230,
                color: "#fff",
                letterSpacing: 6,
                WebkitTextStroke: "18px #000",
                paintOrder: "stroke fill",
                transform: `translateY(-90px) scale(${lerp(2.2, 1, E.outExpo(clamp(dropT / 9)))})`,
                opacity: clamp(1 - (dropT - 40) / 12),
              }}
            >
              REVANCHIE
            </div>
          </AbsoluteFill>
        )}
        <Grain opacity={0.06} />
        <Vignette strength={0.45} />
      </AbsoluteFill>
    );
  } else {
    // ---- ENDCARD
    const t = f - bf(O0);
    const logo = BEATS.logo;
    const lt = f - logo;
    const subbed = f >= BEATS.subscribe;
    const tap = f >= BEATS.subscribe - 4 && f < BEATS.subscribe + 6;
    scene = (
      <AbsoluteFill style={{ background: "#07030d" }}>
        <Background id="Rfj5lAsYpZs" dim={0.3} />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", transform: "translateY(-120px)" }}>
          <Img
            src={staticFile(CHANNEL.avatar)}
            style={{
              width: 360,
              height: 360,
              borderRadius: 180,
              border: "12px solid #fff",
              transform: `scale(${lerp(0.4, 1, E.outBack(clamp(t / 14)))})`,
            }}
          />
          <div style={{ height: 40 }} />
          {lt >= 0 ? (
            <div style={{ fontFamily: F.display, fontSize: 200, color: "#fff", letterSpacing: 8, WebkitTextStroke: "14px #000", paintOrder: "stroke fill", display: "flex" }}>
              {"REVANCHIE".split("").map((c, i) => {
                const k = clamp((lt - i * 1.5) / 6);
                return (
                  <span key={i} style={{ display: "inline-block", opacity: k > 0 ? 1 : 0, transform: `scale(${lerp(2.2, 1, E.outExpo(k))})` }}>
                    {c}
                  </span>
                );
              })}
            </div>
          ) : (
            <div style={{ fontFamily: F.cine, fontWeight: 300, fontSize: 64, letterSpacing: 24, color: "#fff", opacity: clamp((t - 10) / 10), height: 200, display: "flex", alignItems: "center" }}>
              DAS IST
            </div>
          )}
          <div style={{ fontFamily: F.yt, fontSize: 40, color: "#ccc", marginTop: 18, opacity: clamp(lt / 12) }}>
            {CHANNEL.handle} · {CHANNEL.subscribers}
          </div>
          <div style={{ marginTop: 50, opacity: clamp((lt - 6) / 10), transform: `scale(${tap ? 0.92 : 1})` }}>
            <SubscribeButton state={subbed ? 1 : 0} scale={1.5} />
          </div>
        </AbsoluteFill>
        {/* Tap-Kreis wie auf dem Handy */}
        {f >= BEATS.subscribe - 2 && f < BEATS.subscribe + 22 && (
          <div
            style={{
              position: "absolute",
              left: SW / 2 - 60,
              top: SH / 2 + 300,
              width: 120,
              height: 120,
              borderRadius: 60,
              border: "6px solid rgba(255,255,255,0.8)",
              transform: `scale(${lerp(0.4, 1.6, clamp((f - BEATS.subscribe + 2) / 22))})`,
              opacity: 1 - clamp((f - BEATS.subscribe + 2) / 22),
            }}
          />
        )}
        <Grain opacity={0.08} />
        <Vignette strength={0.6} />
        <AbsoluteFill style={{ background: "#000", opacity: clamp((f - (BEATS.durationInFrames - 18)) / 17) }} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <Chroma amount={ca} angle={0.4}>
        <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg) scale(${punch})` }}>{scene}</AbsoluteFill>
      </Chroma>
      <Flash opacity={Math.min(1, flash)} />
      <Audio src={staticFile("audio/short.wav")} />
    </AbsoluteFill>
  );
};

export const SHORT_FRAMES = BEATS.durationInFrames;
