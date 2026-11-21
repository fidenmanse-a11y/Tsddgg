import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Img, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { CHANNEL, thumb } from "../data/channel";
import { E, clamp, lerp, rand, shake } from "../lib";
import { Chroma, Grain } from "../components/fx";
import { F, FONT_SPECS } from "../fonts";
import BEATS from "./beats.json";

// REVANCHIE – Phonk-Edit (YouTube Short, 1080×1920, 60 fps)
// * Schnitte auf den erkannten Beats des Songs (beats.json)
// * Effekte audio-reaktiv: Kick-/Snare-Hüllkurven pro Frame aus dem Song
// * Thumbnails als Vollbild-Kamerafahrten (9:16-Ausschnitte mit Fokuspunkten)

export const SW = 1080;
export const SH = 1920;

type Kind = "intro" | "A" | "R" | "F" | "Q" | "O" | "S";
type Sect = { kind: Kind; from: number; to: number; step: number };
const BT: number[] = BEATS.beats;
const SECTS = BEATS.sections as Sect[];
const KICK: number[] = BEATS.env.kick;
const SNARE: number[] = BEATS.env.snare;
const DROP = SECTS.find((s) => s.kind !== "intro")!.from;
const OUT = SECTS.find((s) => s.kind === "O")!.from;

const bf = (i: number) => {
  const k = Math.max(0, Math.min(BT.length - 2, Math.floor(i)));
  return BT[k] + (BT[k + 1] - BT[k]) * (i - k);
};
const beatAt = (f: number) => {
  for (let k = 0; k < BT.length - 1; k++) if (f < BT[k + 1]) return k + (f - BT[k]) / (BT[k + 1] - BT[k]);
  return BT.length - 1;
};
const env = (arr: number[], f: number) => {
  const i = Math.floor(f);
  const a = arr[Math.max(0, Math.min(arr.length - 1, i))] ?? 0;
  const c = arr[Math.max(0, Math.min(arr.length - 1, i + 1))] ?? 0;
  return lerp(a, c, f - i);
};

// ---------------------------------------------------------------- Kamerafahrten
// fx/fy = Bildpunkt (0..1) in der Mitte des Ausschnitts, z = Zoom (1 = volle Höhe)
type Cam = { fx: number; fy: number; z: number };
type Move = { id: string; a: Cam; b: Cam };
const m = (id: string, a: [number, number, number], b: [number, number, number]): Move => ({
  id,
  a: { fx: a[0], fy: a[1], z: a[2] },
  b: { fx: b[0], fy: b[1], z: b[2] },
});

const INTRO: Move[] = [
  m("Rfj5lAsYpZs", [0.5, 0.42, 1.25], [0.5, 0.38, 1.6]), // Gesicht
  m("cqVsmIshzLc", [0.2, 0.45, 1.1], [0.62, 0.4, 1.1]), // Gegner -> Revanchie (Pan)
  m("QJw0v8rWq90", [0.5, 0.45, 1.05], [0.5, 0.4, 1.45]),
  m("QPQtvx-q1eo", [0.5, 0.42, 1.05], [0.5, 0.36, 2.0]), // Velocity in den Drop
];
const CHAR: Move[] = [
  m("Rfj5lAsYpZs", [0.5, 0.45, 1.0], [0.5, 0.36, 1.5]),
  m("cqVsmIshzLc", [0.2, 0.45, 1.15], [0.68, 0.4, 1.15]), // "VS"-Pan
  m("QJw0v8rWq90", [0.5, 0.4, 1.35], [0.5, 0.4, 1.0]),
  m("0c5uPCQwZO0", [0.68, 0.35, 1.5], [0.55, 0.5, 1.1]),
  m("Eq2_E58U2S8", [0.35, 0.4, 1.2], [0.62, 0.4, 1.2]),
  m("tS_BQ12nfjk", [0.45, 0.35, 1.6], [0.45, 0.45, 1.05]),
  m("gtwiE_Cul84", [0.25, 0.35, 1.25], [0.72, 0.45, 1.25]),
  m("2oXza_81aYY", [0.5, 0.5, 1.0], [0.5, 0.36, 1.45]),
  m("QPQtvx-q1eo", [0.5, 0.36, 1.5], [0.5, 0.45, 1.1]),
  m("Rfj5lAsYpZs", [0.75, 0.85, 1.6], [0.5, 0.42, 1.2]), // Mace -> Gesicht
  m("QJw0v8rWq90", [0.84, 0.42, 1.4], [0.5, 0.4, 1.4]), // Spear -> Gesicht
  m("2oXza_81aYY", [0.72, 0.75, 1.5], [0.5, 0.42, 1.1]),
  m("0c5uPCQwZO0", [0.3, 0.55, 1.4], [0.62, 0.35, 1.4]),
  m("tS_BQ12nfjk", [0.5, 0.5, 1.0], [0.45, 0.3, 1.7]),
];
const ITEMS: Move[] = [
  m("rAa4f9RQCP8", [0.5, 0.68, 1.25], [0.5, 0.66, 1.5]),
  m("WaBZP5Uy2nA", [0.5, 0.68, 1.25], [0.5, 0.68, 1.55]),
  m("ZaLb3fu6j-Y", [0.5, 0.45, 1.1], [0.5, 0.45, 1.4]),
  m("veJacP4gTIU", [0.5, 0.68, 1.3], [0.5, 0.68, 1.6]),
  m("rbj0AadIZtE", [0.5, 0.82, 1.7], [0.5, 0.82, 2.1]),
  m("WaBZP5Uy2nA", [0.8, 0.7, 1.3], [0.8, 0.7, 1.6]),
  m("ZaLb3fu6j-Y", [0.15, 0.4, 1.25], [0.15, 0.4, 1.55]),
  m("rAa4f9RQCP8", [0.4, 0.13, 1.7], [0.4, 0.13, 2.0]),
  m("WaBZP5Uy2nA", [0.2, 0.68, 1.3], [0.2, 0.68, 1.6]),
  m("veJacP4gTIU", [0.45, 0.15, 1.7], [0.45, 0.15, 2.0]),
];

type Trans = "cut" | "flash" | "zoomblur" | "whip" | "strobe" | "spin";
type Shot = { mv: Move; from: number; to: number; sect: Kind; n: number; trans: Trans; dir: number; ease: "out" | "in" };

const SHOTS: Shot[] = (() => {
  const out: Shot[] = [];
  let ci = 0;
  let ii = 0;
  let n = 0;
  const cycle: Trans[] = ["zoomblur", "whip", "flash", "spin", "strobe", "whip", "cut", "zoomblur"];
  for (const s of SECTS) {
    if (s.kind === "O") continue;
    let k = 0;
    for (let b = s.from; b < s.to - 1e-6; b += s.step, k++) {
      const to = Math.min(s.to, b + s.step);
      let mv: Move;
      let trans: Trans = "cut";
      if (s.kind === "intro") mv = INTRO[k % INTRO.length];
      else if (s.kind === "R" || s.kind === "Q") {
        // Schnellteile: Items und Gesichter abwechselnd
        mv = k % 2 === 0 ? ITEMS[ii++ % ITEMS.length] : CHAR[ci++ % CHAR.length];
        trans = k % 4 === 0 ? "flash" : "cut";
      } else {
        mv = CHAR[ci++ % CHAR.length];
        trans = b === DROP ? "flash" : cycle[n % cycle.length];
      }
      out.push({ mv, from: b, to, sect: s.kind, n: n++, trans, dir: n % 2 ? 1 : -1, ease: k % 4 === 3 ? "in" : "out" });
    }
  }
  return out;
})();

// ---------------------------------------------------------------- Bildausschnitt
const IMG_W = 1280;
const IMG_H = 720;
const Frame: React.FC<{ id: string; cam: Cam }> = ({ id, cam }) => {
  const s0 = SH / IMG_H;
  const w = IMG_W * s0 * cam.z;
  const h = SH * cam.z;
  const tx = clamp(SW / 2 - cam.fx * w, SW - w, 0);
  const ty = clamp(SH / 2 - cam.fy * h, SH - h, 0);
  return <Img src={staticFile(thumb(id))} style={{ position: "absolute", left: tx, top: ty, width: w, height: h }} />;
};

const camAt = (s: Shot, f: number, frozenAt?: number) => {
  const t = frozenAt ?? f;
  const p = clamp((t - bf(s.from)) / (bf(s.to) - bf(s.from)));
  // "Velocity": entweder schnell rein und ausgleiten, oder langsam und in den nächsten Schnitt beschleunigen
  const e = s.ease === "out" ? E.outQuint(p) : Math.pow(p, 3.2);
  return { fx: lerp(s.mv.a.fx, s.mv.b.fx, e), fy: lerp(s.mv.a.fy, s.mv.b.fy, e), z: lerp(s.mv.a.z, s.mv.b.z, e) };
};

const Stroke: React.FC<{ text: string; size: number; t: number; y?: number; color?: string; rot?: number }> = ({ text, size, t, y = 820, color = "#fff", rot = 0 }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: y,
      textAlign: "center",
      fontFamily: F.display,
      fontSize: size,
      lineHeight: 1,
      letterSpacing: 4,
      color,
      WebkitTextStroke: `${Math.round(size / 12)}px #000`,
      paintOrder: "stroke fill",
      transform: `scale(${lerp(1.6, 1, E.outExpo(clamp(t)))}) rotate(${rot}deg)`,
      opacity: clamp(t * 4),
    }}
  >
    {text}
  </div>
);

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
  const kick = env(KICK, f);
  const snare = env(SNARE, f);
  const sinceDrop = f - bf(DROP);
  const sinceOut = f - bf(OUT);

  // ================================================================ ENDCARD
  if (b >= OUT) {
    const t = sinceOut;
    const sh = shake(f, 0.9 * Math.exp(-t / 10) + kick * 0.25, "end");
    const fade = clamp((f - (BEATS.durationInFrames - 24)) / 23);
    return (
      <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
        <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) scale(${1 + kick * 0.04})` }}>
          <AbsoluteFill style={{ filter: "blur(30px) brightness(0.32) saturate(1.4)", transform: `scale(${1.25 + t * 0.0015})` }}>
            <Frame id="Rfj5lAsYpZs" cam={{ fx: 0.5, fy: 0.4, z: 1.2 }} />
          </AbsoluteFill>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
            <Img
              src={staticFile(CHANNEL.avatar)}
              style={{ width: 300, height: 300, borderRadius: 150, border: "10px solid #fff", marginBottom: 50, transform: `scale(${lerp(2.2, 1, E.outExpo(clamp(t / 10)))})`, opacity: clamp(t / 4) }}
            />
            <div style={{ display: "flex", fontFamily: F.display, fontSize: 210, letterSpacing: 6, color: "#fff", WebkitTextStroke: "16px #000", paintOrder: "stroke fill" }}>
              {"REVANCHIE".split("").map((c, i) => {
                const k = clamp((t - i * 1.6) / 6);
                return (
                  <span key={i} style={{ display: "inline-block", opacity: k > 0 ? 1 : 0, transform: `scale(${lerp(2.4, 1, E.outExpo(k))})` }}>
                    {c}
                  </span>
                );
              })}
            </div>
            <div style={{ fontFamily: F.cine, fontWeight: 600, fontSize: 44, letterSpacing: 10, color: "#d9c4ff", marginTop: 26, opacity: clamp((t - 18) / 12) }}>
              {CHANNEL.handle.toUpperCase()}
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
        <AbsoluteFill style={{ background: "#fff", opacity: Math.exp(-t / 4) }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)" }} />
        <Grain opacity={0.09} />
        <AbsoluteFill style={{ background: "#000", opacity: fade }} />
        <Audio src={staticFile("audio/short.wav")} />
      </AbsoluteFill>
    );
  }

  // ================================================================ SHOTS
  const s = [...SHOTS].reverse().find((x) => b >= x.from) ?? SHOTS[0];
  const start = bf(s.from);
  const len = bf(s.to) - start;
  const age = f - start;
  const intro = s.sect === "intro";

  // Freeze-Teil: auf der Eins und auf der Mitte steht das Bild kurz still (S/W, harter Shake)
  let frozenAt: number | undefined;
  let freezeK = 0;
  if (s.sect === "F") {
    for (const off of [0, len / 2]) {
      if (age >= off && age < off + 7) {
        frozenAt = start + off;
        freezeK = 1 - (age - off) / 7;
      }
    }
  }
  const cam = camAt(s, f, frozenAt);

  // Reaktive Werte
  const main = !intro;
  const zoomReact = main ? 1 + kick * 0.075 : 1 + kick * 0.02;
  const dropHit = sinceDrop >= 0 ? Math.exp(-sinceDrop / 9) : 0;
  const shakeAmt = (main ? kick * 0.42 : kick * 0.12) + dropHit * 1.1 + freezeK * 0.9;
  const sh = shake(f, shakeAmt, "edit", 1.1);
  const ca = main ? snare * 16 + dropHit * 26 + freezeK * 12 : 0;

  // Übergang in den Shot
  let tr = "";
  let blur = false;
  let black = false;
  let flash = 0;
  if (s.trans === "zoomblur" && age < 8) {
    tr = `scale(${lerp(1.45, 1, E.outExpo(clamp(age / 8)))})`;
    blur = true;
  }
  if (s.trans === "whip" && age < 9) {
    tr = `translateX(${lerp(SW * 1.1 * s.dir, 0, E.outExpo(clamp(age / 9)))}px)`;
    blur = true;
  }
  if (s.trans === "spin" && age < 10) {
    tr = `rotate(${lerp(22 * s.dir, 0, E.outBack(clamp(age / 10)))}deg) scale(${lerp(1.3, 1, E.outExpo(clamp(age / 10)))})`;
    blur = true;
  }
  if (s.trans === "strobe" && age < 3) black = true;
  if (s.trans === "flash") flash = Math.exp(-age / 3.5);
  flash = Math.max(flash, main ? snare * 0.18 : 0);
  const invert = (sinceDrop >= 0 && sinceDrop < 4) || (s.sect === "Q" && s.n % 3 === 0 && age < 3);

  // Color-Grading
  const gray = intro || freezeK > 0;
  const flicker = intro ? 0.82 + 0.18 * rand(Math.floor(f / 3)) : 1;
  const grade = gray
    ? `grayscale(1) contrast(${intro ? 1.35 : 1.6}) brightness(${(intro ? 0.95 : 1.05) * flicker})`
    : `contrast(1.28) saturate(1.35) brightness(${0.94 + snare * 0.12})`;

  const shotLayer = (
    <AbsoluteFill style={{ transform: tr }}>
      <AbsoluteFill style={{ transform: `scale(${zoomReact})` }}>
        <Frame id={s.mv.id} cam={cam} />
      </AbsoluteFill>
    </AbsoluteFill>
  );

  // Texte – wenige, knallende Einblender
  let text: React.ReactNode = null;
  if (sinceDrop >= 0 && b < DROP + 2) {
    text = <Stroke text="REVANCHIE" size={210} t={sinceDrop / 8} rot={-3} />;
  }
  const rSect = SECTS.find((x) => x.kind === "R");
  if (rSect && b >= rSect.from && b < rSect.from + 3) {
    const wi = Math.floor(b - rSect.from);
    const word = ["SPEAR", "MACE", "MASTER"][wi];
    text = <Stroke text={word} size={wi === 2 ? 230 : 260} t={(f - bf(rSect.from + wi)) / 6} color={wi === 1 ? "#d7b8ff" : "#fff"} rot={wi === 1 ? 3 : -3} />;
  }
  if (intro && b >= DROP - 4) {
    // die letzten 4 Beats vor dem Drop: Name baut sich auf, ein Buchstabe pro halbem Beat
    const n = Math.min(9, Math.floor((b - (DROP - 4)) * 2.25) + 1);
    text = (
      <div style={{ position: "absolute", left: 0, right: 0, top: 840, textAlign: "center", fontFamily: F.display, fontSize: 150, letterSpacing: 10, color: "#fff", WebkitTextStroke: "12px #000", paintOrder: "stroke fill" }}>
        {"REVANCHIE".slice(0, n)}
      </div>
    );
  }

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ filter: invert ? "invert(1)" : undefined }}>
        <Chroma amount={ca} angle={0.5}>
          <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg)`, filter: grade }}>
            {blur ? (
              <CameraMotionBlur samples={6} shutterAngle={240}>
                {shotLayer}
              </CameraMotionBlur>
            ) : (
              shotLayer
            )}
          </AbsoluteFill>
        </Chroma>
        {/* Lila Grading-Overlay + Vignette */}
        {!gray && <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(90,20,200,0.35), rgba(20,0,40,0.1) 45%, rgba(120,20,180,0.35))", mixBlendMode: "soft-light" }} />}
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent ${intro ? 38 : 45}%, rgba(0,0,0,${intro ? 0.8 : 0.7}) 100%)` }} />
        {text}
      </AbsoluteFill>
      {black && <AbsoluteFill style={{ background: "#000" }} />}
      {flash > 0.01 && <AbsoluteFill style={{ background: "#fff", opacity: Math.min(1, flash) }} />}
      {/* letzter halber Beat vor dem Drop: Bild saugt sich ins Schwarze */}
      {intro && <AbsoluteFill style={{ background: "#000", opacity: clamp((f - bf(DROP - 0.5)) / (bf(DROP) - bf(DROP - 0.5))) }} />}
      <Grain opacity={intro ? 0.18 : 0.08} />
      <Audio src={staticFile("audio/short.wav")} />
    </AbsoluteFill>
  );
};

export const SHORT_FRAMES = BEATS.durationInFrames;
