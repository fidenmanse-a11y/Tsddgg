import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Freeze, Img, OffthreadVideo, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { CHANNEL, VIDEOS, thumb } from "../data/channel";
import { E, clamp, lerp, rand, shake } from "../lib";
import { Chroma, Grain } from "../components/fx";
import { F, FONT_SPECS } from "../fonts";
import BEATS_RAW from "./beats.json";

// REVANCHIE – Clip-Edit (YouTube Short, 1080×1920, 60 fps)
// Ablauf aus src/short/config.json ("edit"): Thumbnail (komplett sichtbar) → Gameplay-Clips aus diesem Video → …
// Clips: Originalton entfernt, Hochformat-Reframing, Speed-Ramp, deren Hit exakt auf einem Beat landet.
// Musik: nur der Song (public/audio/short.wav), Effekte reagieren auf dessen Kicks/Snares.

export const EW = 1080;
export const EH = 1920;
const FPS = 60;

type Item = {
  t: "thumb" | "clip";
  from: number;
  to: number;
  beats: number;
  video?: string; // thumb: YouTube-ID
  clip?: string; // clip: Name in clips_auto.json
  hit?: number; // Sekunde im Clip, die auf dem Hit-Beat landen soll
  hitBeat?: number; // Beat innerhalb des Items (Default 1)
  focus?: number; // horizontaler Bildfokus 0..1 (Default 0.5)
  focusTo?: number; // Kamerafahrt zum Ende des Items
  zoom?: number;
  ramp?: "slowhit" | "steady" | "fast";
  bw?: boolean;
  text?: string;
};
type ClipInfo = { file: string; duration: number; size: [number, number]; hits: number[] };

const BEATS = BEATS_RAW as unknown as {
  beats: number[];
  env: { kick: number[]; snare: number[] };
  items?: Item[];
  introItems?: Item[];
  clips?: Record<string, ClipInfo>;
  dropBeat?: number;
  outBeat?: number;
  durationInFrames: number;
};
const BT = BEATS.beats;
const ITEMS: Item[] = [...(BEATS.introItems ?? []).map((i) => ({ ...i, bw: i.bw ?? true })), ...(BEATS.items ?? [])];
const CLIPS = BEATS.clips ?? {};
const DROP = BEATS.dropBeat ?? 0;
const OUT = BEATS.outBeat ?? BT.length - 1;

const bf = (i: number) => {
  const k = Math.max(0, Math.min(BT.length - 2, Math.floor(i)));
  return BT[k] + (BT[k + 1] - BT[k]) * (i - k);
};
const beatAt = (f: number) => {
  for (let k = 0; k < BT.length - 1; k++) if (f < BT[k + 1]) return k + (f - BT[k]) / (BT[k + 1] - BT[k]);
  return BT.length - 1;
};
const env = (arr: number[], f: number) => {
  const i = Math.max(0, Math.min(arr.length - 1, Math.floor(f)));
  return lerp(arr[i] ?? 0, arr[Math.min(arr.length - 1, i + 1)] ?? 0, f - Math.floor(f));
};

/** Zeit-Remapping: Edit-Frame -> Sekunde im Clip. Der Hit landet exakt auf dem Hit-Beat. */
const srcTime = (it: Item, f: number) => {
  const c = CLIPS[it.clip!];
  const hitF = bf(it.from + (it.hitBeat ?? 1));
  const hit = it.hit ?? c?.hits?.[0] ?? 1;
  const dt = (f - hitF) / FPS; // Sekunden relativ zum Hit (Edit-Zeit)
  const ramp = it.ramp ?? "slowhit";
  let s: number;
  if (dt < 0) {
    s = hit + dt * (ramp === "fast" ? 1.6 : 1.0);
  } else if (ramp === "slowhit") {
    // Zeitlupe direkt nach dem Hit (0,28x), dann weich auf 1,7x hochrampen
    const w1 = 0.32;
    const w2 = 0.3;
    if (dt < w1) s = hit + dt * 0.28;
    else if (dt < w1 + w2) {
      const x = dt - w1;
      s = hit + w1 * 0.28 + 0.28 * x + ((1.7 - 0.28) * x * x) / (2 * w2);
    } else s = hit + w1 * 0.28 + w2 * (0.28 + 1.7) / 2 + (dt - w1 - w2) * 1.7;
  } else {
    s = hit + dt * (ramp === "fast" ? 1.6 : 1.0);
  }
  const dur = c?.duration ?? 9999;
  return clamp(s, 0, dur - 0.05);
};

const ClipFrame: React.FC<{ it: Item; f: number; frozenAt?: number }> = ({ it, f, frozenAt }) => {
  const c = CLIPS[it.clip!];
  if (!c) return <AbsoluteFill style={{ background: "#111" }} />;
  const t = srcTime(it, frozenAt ?? f);
  const [w, h] = c.size;
  const p = clamp((f - bf(it.from)) / (bf(it.to) - bf(it.from)));
  const focus = lerp(it.focus ?? 0.5, it.focusTo ?? it.focus ?? 0.5, E.inOutCubic(p));
  const z = it.zoom ?? 1.0;
  const dh = EH * z;
  const dw = (dh * w) / h;
  const left = clamp(EW / 2 - focus * dw, EW - dw, 0);
  const top = (EH - dh) / 2;
  return (
    <AbsoluteFill>
      <Freeze frame={Math.round(t * FPS)}>
        <OffthreadVideo src={staticFile(c.file)} muted style={{ position: "absolute", left, top, width: dw, height: dh }} />
      </Freeze>
    </AbsoluteFill>
  );
};

const ThumbCard: React.FC<{ it: Item; f: number }> = ({ it, f }) => {
  const age = f - bf(it.from);
  const id = it.video!;
  const v = VIDEOS[id];
  const k = E.outExpo(clamp(age / 9));
  return (
    <AbsoluteFill style={{ background: "#05020a" }}>
      <Img src={staticFile(thumb(id))} style={{ position: "absolute", width: EW, height: EH, objectFit: "cover", filter: "blur(40px) brightness(0.35) saturate(1.4)", transform: "scale(1.2)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            width: 1020,
            height: 574,
            borderRadius: 22,
            overflow: "hidden",
            boxShadow: "0 50px 120px rgba(0,0,0,0.8)",
            transform: `translateY(-60px) scale(${lerp(1.55, 1, k) + age * 0.0007}) rotate(${lerp(-6, 0, k)}deg)`,
          }}
        >
          <Img src={staticFile(thumb(id))} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        {v && (
          <div
            style={{
              position: "absolute",
              left: 60,
              right: 60,
              top: 1260,
              textAlign: "center",
              fontFamily: F.yt,
              fontWeight: 700,
              fontSize: 50,
              color: "#fff",
              textShadow: "0 4px 18px rgba(0,0,0,0.95)",
              opacity: clamp((age - 4) / 6),
            }}
          >
            {v.title}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
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

export const ClipEdit: React.FC = () => {
  const f = useCurrentFrame();
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(FONT_SPECS.map((s) => document.fonts.load(s)))
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);

  const b = beatAt(f);
  const kick = env(BEATS.env.kick, f);
  const snare = env(BEATS.env.snare, f);
  const sinceDrop = f - bf(DROP);

  // ================================================================ ENDCARD
  if (b >= OUT) {
    const t = f - bf(OUT);
    const sh = shake(f, 0.9 * Math.exp(-t / 10) + kick * 0.25, "end");
    const fade = clamp((f - (BEATS.durationInFrames - 24)) / 23);
    return (
      <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
        <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) scale(${1 + kick * 0.04})` }}>
          <Img src={staticFile(thumb("Rfj5lAsYpZs"))} style={{ position: "absolute", width: EW, height: EH, objectFit: "cover", filter: "blur(34px) brightness(0.3) saturate(1.4)", transform: `scale(${1.25 + t * 0.0015})` }} />
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
            <Img src={staticFile(CHANNEL.avatar)} style={{ width: 300, height: 300, borderRadius: 150, border: "10px solid #fff", marginBottom: 50, transform: `scale(${lerp(2.2, 1, E.outExpo(clamp(t / 10)))})`, opacity: clamp(t / 4) }} />
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

  const it = [...ITEMS].reverse().find((x) => b >= x.from) ?? ITEMS[0];
  if (!it) return <AbsoluteFill style={{ background: "#000" }} />;
  const start = bf(it.from);
  const age = f - start;
  const idx = ITEMS.indexOf(it);
  const isIntro = b < DROP;
  const hitF = it.t === "clip" ? bf(it.from + (it.hitBeat ?? 1)) : start;
  const sinceHit = f - hitF;

  // Impact-Frame: 2 Frames S/W-Freeze + Invert genau auf dem Hit
  const impact = it.t === "clip" && !isIntro && sinceHit >= 0 && sinceHit < 3 && it.ramp !== "steady";
  const hitK = it.t === "clip" && sinceHit >= 0 ? Math.exp(-sinceHit / 8) : 0;

  const main = !isIntro;
  const dropHit = sinceDrop >= 0 ? Math.exp(-sinceDrop / 9) : 0;
  const shakeAmt = (main ? kick * 0.38 : kick * 0.1) + dropHit * 1.0 + hitK * 0.8;
  const sh = shake(f, shakeAmt, "edit", 1.1);
  const ca = main ? snare * 14 + dropHit * 24 + hitK * 18 : 0;
  const punch = 1 + (main ? kick * 0.07 : 0.01 * kick) + hitK * 0.08;

  // Übergang: Thumbnails knallen rein, Clips kommen mit Zoom-Blur oder Whip
  let tr = "";
  let blur = false;
  const dir = idx % 2 ? 1 : -1;
  if (it.t === "clip" && age < 8 && idx % 3 === 1) {
    tr = `translateX(${lerp(EW * 1.05 * dir, 0, E.outExpo(clamp(age / 8)))}px)`;
    blur = true;
  } else if (age < 7 && main) {
    tr = `scale(${lerp(1.35, 1, E.outExpo(clamp(age / 7)))})`;
    blur = it.t === "clip";
  }
  const flash = Math.max(it.t === "thumb" && main ? Math.exp(-age / 3.5) : 0, main ? snare * 0.14 : 0, sinceDrop >= 0 && sinceDrop < 12 ? Math.exp(-sinceDrop / 3) : 0);
  const invert = (sinceDrop >= 0 && sinceDrop < 3) || impact;

  const gray = it.bw || isIntro || impact;
  const flicker = isIntro ? 0.85 + 0.15 * rand(Math.floor(f / 3)) : 1;
  const grade = gray ? `grayscale(1) contrast(1.4) brightness(${0.92 * flicker})` : `contrast(1.22) saturate(1.3) brightness(${0.96 + snare * 0.1})`;

  const layer = (
    <AbsoluteFill style={{ transform: tr }}>
      <AbsoluteFill style={{ transform: `scale(${punch})` }}>{it.t === "clip" ? <ClipFrame it={it} f={f} /> : <ThumbCard it={it} f={f} />}</AbsoluteFill>
    </AbsoluteFill>
  );

  let text: React.ReactNode = null;
  if (sinceDrop >= 0 && sinceDrop < bf(DROP + 2) - bf(DROP) && it.t === "clip") text = <Stroke text="REVANCHIE" size={210} t={sinceDrop / 8} rot={-3} />;
  if (it.text) text = <Stroke text={it.text} size={200} t={age / 7} rot={idx % 2 ? 3 : -3} y={1180} />;
  if (isIntro && b >= DROP - 4) {
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
              <CameraMotionBlur samples={5} shutterAngle={220}>
                {layer}
              </CameraMotionBlur>
            ) : (
              layer
            )}
          </AbsoluteFill>
        </Chroma>
        {!gray && <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(90,20,200,0.32), rgba(20,0,40,0.08) 45%, rgba(120,20,180,0.32))", mixBlendMode: "soft-light" }} />}
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent ${isIntro ? 38 : 50}%, rgba(0,0,0,${isIntro ? 0.8 : 0.6}) 100%)` }} />
        {text}
      </AbsoluteFill>
      {flash > 0.01 && <AbsoluteFill style={{ background: "#fff", opacity: Math.min(1, flash) }} />}
      {isIntro && <AbsoluteFill style={{ background: "#000", opacity: clamp((f - bf(DROP - 0.5)) / (bf(DROP) - bf(DROP - 0.5))) }} />}
      <Grain opacity={isIntro ? 0.16 : 0.07} />
      <Audio src={staticFile("audio/short.wav")} />
    </AbsoluteFill>
  );
};

export const EDIT_FRAMES = BEATS.durationInFrames;
