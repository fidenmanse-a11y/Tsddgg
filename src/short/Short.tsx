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
// Schnitt und Effekte hängen komplett an beats.json:
// erkannte Beats des Songs + Abschnitte (intro / A / R / S / O) aus src/short/config.json.

export const SW = 1080;
export const SH = 1920;

type SectKind = "intro" | "A" | "R" | "S" | "O";
type Sect = { kind: SectKind; from: number; to: number; step: number };

const BT: number[] = BEATS.beats;
const SECTS = BEATS.sections as Sect[];
const sectOf = (k: SectKind) => SECTS.find((s) => s.kind === k)!;
const FIRST = SECTS.find((s) => s.kind !== "intro")!.from; // erster Drop
const OUT = sectOf("O").from; // Logo / Endcard

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

// Reihenfolge der echten Thumbnails – bewusst gemischt (Farbe, Motiv, Nah/Weit)
const POOL = ["Rfj5lAsYpZs", "0c5uPCQwZO0", "QJw0v8rWq90", "WaBZP5Uy2nA", "cqVsmIshzLc", "Eq2_E58U2S8", "tS_BQ12nfjk", "2oXza_81aYY", "gtwiE_Cul84", "rbj0AadIZtE", "ZaLb3fu6j-Y", "veJacP4gTIU", "rAa4f9RQCP8", "QPQtvx-q1eo"];
const INTRO_POOL = ["WaBZP5Uy2nA", "QJw0v8rWq90", "cqVsmIshzLc", "0c5uPCQwZO0", "tS_BQ12nfjk", "Rfj5lAsYpZs"];

type Trans = "cut" | "whip" | "zoom" | "spin" | "glitch";
type Shot = { id: string; from: number; to: number; kind: "card" | "full"; trans: Trans; sect: SectKind; n: number };

const SHOTS: Shot[] = (() => {
  const out: Shot[] = [];
  let p = 0;
  let n = 0;
  const tA: Trans[] = ["whip", "zoom", "spin", "glitch", "whip", "cut"];
  for (const s of SECTS) {
    if (s.kind === "O") continue;
    let k = 0;
    for (let b = s.from; b < s.to - 1e-6; b += s.step, k++) {
      const to = Math.min(s.to, b + s.step);
      if (s.kind === "intro") {
        out.push({ id: INTRO_POOL[k % INTRO_POOL.length], from: b, to, kind: k % 2 ? "full" : "card", trans: "cut", sect: "intro", n: n++ });
        continue;
      }
      const id = POOL[p++ % POOL.length];
      const kind: Shot["kind"] = s.kind === "S" ? "card" : s.kind === "R" ? "full" : k % 2 ? "full" : "card";
      const trans: Trans = s.kind === "S" ? "zoom" : s.kind === "R" ? (k % 4 === 3 ? "glitch" : "cut") : k === 0 ? "cut" : tA[k % tA.length];
      out.push({ id, from: b, to, kind, trans, sect: s.kind, n: n++ });
    }
  }
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

const Background: React.FC<{ id: string; dim?: number }> = ({ id, dim = 0.45 }) => (
  <AbsoluteFill>
    <Img src={staticFile(thumb(id))} style={{ width: SW, height: SH, objectFit: "cover", filter: `blur(38px) brightness(${dim}) saturate(1.3)`, transform: "scale(1.2)" }} />
  </AbsoluteFill>
);

const ShotView: React.FC<{ s: Shot; f: number }> = ({ s, f }) => {
  const start = bf(s.from);
  const end = bf(s.to);
  const age = f - start;
  const p = clamp(age / (end - start));
  let enter = "";
  if (s.trans === "whip") enter = `translateY(${lerp(SH * 0.9, 0, E.outExpo(clamp(age / 9)))}px)`;
  if (s.trans === "zoom") enter = `scale(${lerp(0.72, 1, E.outExpo(clamp(age / 10)))})`;
  if (s.trans === "spin") enter = `rotate(${lerp(-14, 0, E.outBack(clamp(age / 12)))}deg) scale(${lerp(1.25, 1, E.outExpo(clamp(age / 12)))})`;
  // "Velocity": langsamer Drift, der auf dem nächsten Schnitt einrastet
  const drift = s.sect === "intro" ? 1 + p * 0.1 : s.sect === "S" ? 1 + p * 0.06 : 1 + p * 0.035;

  const v = VIDEOS[s.id];
  const swing = s.sect === "S" ? `perspective(1600px) rotateY(${Math.sin(age / 26) * 16}deg) rotateX(${6 + Math.sin(age / 40) * 3}deg) ` : "";
  const card = (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 1000, height: 562, borderRadius: 28, overflow: "hidden", boxShadow: "0 40px 90px rgba(0,0,0,0.7)", transform: `${swing}translateY(-90px) scale(${drift})` }}>
        <Img src={staticFile(thumb(s.id))} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </AbsoluteFill>
  );
  const full = (
    <AbsoluteFill style={{ transform: `scale(${drift})` }}>
      <Img src={staticFile(thumb(s.id))} style={{ width: SW, height: SH, objectFit: "cover" }} />
    </AbsoluteFill>
  );
  const showTitle = (s.sect === "A" && s.kind === "card") || s.sect === "S";

  const body = (
    <AbsoluteFill style={{ transform: enter }}>
      {s.kind === "card" && <Background id={s.id} />}
      {s.kind === "card" ? card : full}
      {showTitle && (
        <div
          style={{
            position: "absolute",
            left: 70,
            right: 70,
            top: 1270,
            textAlign: "center",
            fontFamily: F.yt,
            fontWeight: 700,
            fontSize: 46,
            color: "#fff",
            textShadow: "0 3px 14px rgba(0,0,0,0.9)",
            opacity: clamp((age - 2) / 6),
          }}
        >
          {v.title}
          <div style={{ fontWeight: 500, fontSize: 38, color: "#ddd", marginTop: 10 }}>{v.views} Aufrufe</div>
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
  const cur = [...SHOTS].reverse().find((s) => b >= s.from) ?? SHOTS[0];
  const sinceCut = f - bf(cur.from);
  const inMain = b >= FIRST && b < OUT;
  const calm = cur.sect === "S";

  // Punch + Shake auf jedem Schnitt, stärker auf jedem zweiten; RGB-Split auf jedem zweiten
  const strong = cur.n % 2 === 0;
  const punchAmp = inMain ? (calm ? 0.025 : strong ? 0.1 : 0.06) : 0;
  const punch = 1 + punchAmp * Math.exp(-sinceCut / 7);
  const sinceDrop = f - bf(FIRST);
  const shakeAmt = (inMain && !calm ? (strong ? 0.5 : 0.22) * Math.exp(-sinceCut / 6) : 0) + (sinceDrop >= 0 ? 0.9 * Math.exp(-sinceDrop / 10) : 0);
  const sh = shake(f, shakeAmt, "short");
  const ca = inMain && !calm && !strong ? 16 * Math.exp(-sinceCut / 5) : 0;
  const sinceOut = f - bf(OUT);
  const flash = Math.max(sinceDrop >= 0 ? Math.exp(-sinceDrop / 4) : 0, sinceOut >= 0 ? Math.exp(-sinceOut / 4) : 0);

  let scene: React.ReactNode;

  if (b < FIRST) {
    // ---- INTRO: Schwarzweiß, Korn, langsame Shots. Untertitel zur Stimme.
    const [v0, v1] = BEATS.introVo;
    const flicker = 0.85 + 0.15 * rand(Math.floor(f / 3));
    const toDrop = bf(FIRST) - f;
    scene = (
      <AbsoluteFill style={{ background: "#000" }}>
        <AbsoluteFill style={{ filter: `grayscale(1) contrast(1.25) brightness(${0.78 * flicker})` }}>
          <ShotView s={cur} f={f} />
        </AbsoluteFill>
        {f >= v0 - 3 && f < BEATS.introSplit - 2 && <Caption text="OKAY…" t={(f - v0) / 8} size={110} />}
        {f >= BEATS.introSplit - 2 && f < v1 + 50 && <Caption text="WAS IST DAS?!" t={(f - BEATS.introSplit + 2) / 8} size={130} color="#e9d6ff" />}
        {/* letzter Beat vor dem Drop: Bild zieht sich zusammen */}
        <AbsoluteFill style={{ background: "#000", opacity: toDrop < 24 ? (1 - toDrop / 24) * 0.7 : 0 }} />
        <Grain opacity={0.16} />
        <Vignette strength={0.85} />
      </AbsoluteFill>
    );
  } else if (b < OUT) {
    // ---- Haupt-Edit
    const [d0, d1] = BEATS.dasIst;
    scene = (
      <AbsoluteFill style={{ background: "#000" }}>
        <ShotView s={cur} f={f} />
        {sinceDrop < 60 && (
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <div
              style={{
                fontFamily: F.display,
                fontSize: 230,
                color: "#fff",
                letterSpacing: 6,
                WebkitTextStroke: "18px #000",
                paintOrder: "stroke fill",
                transform: `translateY(-90px) scale(${lerp(2.2, 1, E.outExpo(clamp(sinceDrop / 9)))})`,
                opacity: clamp(1 - (sinceDrop - 44) / 12),
              }}
            >
              REVANCHIE
            </div>
          </AbsoluteFill>
        )}
        {f >= d0 - 2 && <Caption text="DAS IST …" t={(f - d0 + 2) / 8} size={120} y={360} />}
        {/* kurz vor dem Logo: alles dunkelt ab */}
        <AbsoluteFill style={{ background: "#000", opacity: f > d0 ? clamp((f - d0) / (bf(OUT) - d0)) * 0.6 : 0 }} />
        <Grain opacity={0.06} />
        <Vignette strength={0.45} />
      </AbsoluteFill>
    );
    void d1;
  } else {
    // ---- LOGO + ENDCARD auf dem großen Drop
    const lt = f - BEATS.logo;
    const subbed = f >= BEATS.subscribe;
    const tap = f >= BEATS.subscribe - 4 && f < BEATS.subscribe + 6;
    scene = (
      <AbsoluteFill style={{ background: "#07030d" }}>
        <Background id="Rfj5lAsYpZs" dim={0.3} />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", transform: "translateY(-120px)" }}>
          <Img
            src={staticFile(CHANNEL.avatar)}
            style={{ width: 360, height: 360, borderRadius: 180, border: "12px solid #fff", transform: `scale(${lerp(2.4, 1, E.outExpo(clamp(lt / 10)))})` }}
          />
          <div style={{ height: 40 }} />
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
          <div style={{ fontFamily: F.yt, fontSize: 40, color: "#ccc", marginTop: 18, opacity: clamp(lt / 12) }}>
            {CHANNEL.handle} · {CHANNEL.subscribers}
          </div>
          <div style={{ marginTop: 50, opacity: clamp((lt - 6) / 10), transform: `scale(${tap ? 0.92 : 1})` }}>
            <SubscribeButton state={subbed ? 1 : 0} scale={1.5} />
          </div>
        </AbsoluteFill>
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
      </AbsoluteFill>
    );
  }

  const sinceLogo = f - BEATS.logo;
  const logoShake = sinceLogo >= 0 ? shake(f, 0.9 * Math.exp(-sinceLogo / 10), "logo") : { x: 0, y: 0, r: 0 };

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <Chroma amount={ca + (sinceLogo >= 0 ? 20 * Math.exp(-sinceLogo / 8) : 0)} angle={0.4}>
        <AbsoluteFill style={{ transform: `translate(${sh.x + logoShake.x}px, ${sh.y + logoShake.y}px) rotate(${sh.r + logoShake.r}deg) scale(${punch})` }}>{scene}</AbsoluteFill>
      </Chroma>
      <Flash opacity={Math.min(1, flash)} />
      <AbsoluteFill style={{ background: "#000", opacity: clamp((f - (BEATS.durationInFrames - 14)) / 13) }} />
      <Audio src={staticFile("audio/short.wav")} />
    </AbsoluteFill>
  );
};

export const SHORT_FRAMES = BEATS.durationInFrames;
