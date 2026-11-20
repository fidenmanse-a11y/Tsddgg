import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { BY_VIEWS, CHANNEL, thumb, Video } from "../data/channel";
import { E, map, prog, impulse, shake, lerp, W, H, drift } from "../lib";
import { SEC, ws, we, ls, le, hit, TOTAL } from "../timeline";
import { Chroma, Flash, Grain, Vignette } from "../components/fx";
import { Cursor, SubscribeButton, VideoCard, YT } from "../components/youtube";
import { F } from "../fonts";

// 0:34 – 0:42  Finale Montage der meistgesehenen Videos (echte Aufrufe),
// "Und glaub mir … das war erst der Anfang."  ->  Endcard mit Abo-Button.

const TOP = BY_VIEWS.slice(0, 6);

const ViewCounter: React.FC<{ v: Video; t: number }> = ({ v, t }) => {
  // Immer die exakte, echte Zahl – kein Hochzählen (sonst stünden kurz erfundene Werte im Bild)
  const txt = v.views;
  const pop = E.outExpo(Math.min(1, t / 5));
  return (
    <div style={{ position: "absolute", left: 70, bottom: 64, fontFamily: F.yt, color: "#fff", textShadow: "0 3px 12px rgba(0,0,0,0.8)" }}>
      <div style={{ fontSize: 34, fontWeight: 500, maxWidth: 1300 }}>{v.title}</div>
      <div style={{ fontSize: 64, fontWeight: 700, marginTop: 4, transform: `scale(${1.25 - 0.25 * pop})`, transformOrigin: "0 100%" }}>
        {txt} <span style={{ fontSize: 34, fontWeight: 500, color: "#ddd" }}>Aufrufe</span>
      </div>
    </div>
  );
};

/** Kanalseite: Banner, Avatar, echte Kennzahlen, Abo-Button */
const ChannelPage: React.FC<{ frame: number; subAt: number }> = ({ frame, subAt }) => {
  const st = frame >= subAt ? 1 : 0;
  const pressed = Math.exp(-Math.max(0, frame - subAt) / 5) * (frame >= subAt - 4 ? 1 : 0);
  const bell = frame >= subAt ? Math.sin((frame - subAt) / 2.2) * 18 * Math.exp(-(frame - subAt) / 14) : 0;
  return (
    <AbsoluteFill style={{ background: YT.bg, fontFamily: F.yt, color: YT.text }}>
      <div style={{ position: "absolute", left: 110, right: 110, top: 50, height: 300, borderRadius: 26, overflow: "hidden" }}>
        <Img src={staticFile(CHANNEL.banner)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ position: "absolute", left: 110, top: 400, display: "flex", gap: 40, alignItems: "center" }}>
        <Img src={staticFile(CHANNEL.avatar)} style={{ width: 230, height: 230, borderRadius: 115 }} />
        <div>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -1 }}>{CHANNEL.name}</div>
          <div style={{ fontSize: 28, color: YT.sub, marginTop: 8 }}>
            <span style={{ color: YT.text, fontWeight: 500 }}>{CHANNEL.handle}</span> · {CHANNEL.subscribers} · {CHANNEL.videoCount}
          </div>
          <div style={{ fontSize: 26, color: YT.sub, marginTop: 8 }}>{CHANNEL.tagline} ›</div>
          <div style={{ marginTop: 26, transform: `scale(${1 - pressed * 0.08}) rotate(${bell * 0.15}deg)`, transformOrigin: "0 50%" }}>
            <SubscribeButton state={st} scale={1.25} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 110, top: 700, display: "flex", gap: 30, fontSize: 26, fontWeight: 500 }}>
        {["Videos", "Shorts", "Playlists", "Community"].map((x, i) => (
          <div key={x} style={{ paddingBottom: 12, borderBottom: i === 0 ? "4px solid #f1f1f1" : "none", color: i === 0 ? YT.text : YT.sub }}>
            {x}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 110, top: 780, display: "flex", gap: 26 }}>
        {BY_VIEWS.slice(0, 4).map((v) => (
          <VideoCard key={v.id} v={v} width={402} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const S6Final: React.FC = () => {
  const frame = useCurrentFrame();
  const s0 = SEC.final.from;
  const l14 = ls("L14");
  const l15 = ls("L15");
  const anfang = ws("L15", 4);
  const endFrom = SEC.end.from;
  const subAt = hit("subscribe");

  // Schnittpunkte: werden immer schneller bis "Und glaub mir"
  const cuts: number[] = [s0];
  const pattern = [14, 12, 10, 8, 6, 6, 4, 4, 3, 3, 3, 3];
  for (const p of pattern) {
    const nxt = cuts[cuts.length - 1] + p;
    if (nxt >= l14 - 2) break;
    cuts.push(nxt);
  }
  let ci = 0;
  for (let i = 0; i < cuts.length; i++) if (frame >= cuts[i]) ci = i;
  const ct = frame - cuts[ci];

  const imp = impulse(frame, [{ at: s0, amp: 0.8, decay: 9 }, ...cuts.slice(1).map((c) => ({ at: c, amp: 0.18, decay: 4 })), { at: subAt, amp: 0.25, decay: 6 }]);
  const sh = shake(frame, imp, "s6");

  // --- Endcard
  if (frame >= endFrom) {
    const t = frame - endFrom;
    const zoomOut = E.outExpo(Math.min(1, t / 30));
    const d = drift(frame, 0.6, "end");
    // Cursor fliegt zum Abo-Button
    const btnX = 110 + 230 + 40 + 40;
    const btnY = 400 + 205;
    const cp = prog(frame, endFrom + 16, subAt - endFrom - 18, E.inOutCubic);
    const cx = lerp(1500, btnX + 70, cp);
    const cy = lerp(950, btnY + 10, cp);
    const fadeOut = map(frame, [TOTAL - 20, TOTAL - 1], [0, 1]);
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <AbsoluteFill style={{ transform: `translate(${d.x + sh.x}px, ${d.y + sh.y}px) scale(${lerp(1.5, 1, zoomOut)})`, transformOrigin: "35% 45%" }}>
          <ChannelPage frame={frame} subAt={subAt} />
          <Cursor x={cx} y={cy} down={frame >= subAt - 3 && frame < subAt + 4 ? 1 : 0} />
        </AbsoluteFill>
        <Vignette strength={0.35} />
        <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />
      </AbsoluteFill>
    );
  }

  // --- "Und glaub mir …" : Zeitlupe auf dem meistgesehenen Video, dann Pull-Back
  if (frame >= l14 - 2) {
    const v = TOP[0];
    const t = frame - (l14 - 2);
    const back = prog(frame, anfang - 6, endFrom - (anfang - 6), E.inExpo);
    const s = lerp(1.25 + t * 0.0009, 0.18, back);
    return (
      <AbsoluteFill style={{ background: "#07020f" }}>
        <CameraMotionBlur samples={back > 0.02 ? 6 : 1} shutterAngle={200}>
          <AbsoluteFill style={{ transform: `scale(${s}) rotate(${back * -4}deg)` }}>
            <Img src={staticFile(thumb(v.id))} style={{ width: W, height: H, objectFit: "cover", filter: `saturate(${map(t, [0, 40], [1.2, 0.8])})` }} />
          </AbsoluteFill>
        </CameraMotionBlur>
        <Vignette strength={0.8 - back * 0.5} />
        <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(5,0,15,0.85) 0%, rgba(5,0,15,0.35) 40%, transparent 65%)", opacity: 1 - back }} />
        {frame < anfang + 30 && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, textAlign: "center", fontFamily: F.cine, color: "#fff", opacity: 1 - back }}>
            <div style={{ fontSize: 52, fontWeight: 300, letterSpacing: 14, opacity: prog(frame, l14, 10) }}>UND GLAUB MIR …</div>
            <div style={{ fontFamily: F.display, fontSize: 130, letterSpacing: 4, marginTop: 10, opacity: prog(frame, l15, 6) }}>
              {["DAS", "WAR", "ERST", "DER", "ANFANG."].map((w, i) => (
                <span key={i} style={{ marginRight: 30, opacity: frame >= ws("L15", i) - 1 ? 1 : 0.0, color: i === 4 ? "#c9a2ff" : "#fff" }}>
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}
        <Grain opacity={0.08} />
      </AbsoluteFill>
    );
  }

  // --- Montage
  const v = TOP[ci % TOP.length];
  const style = ci % 4;
  let tr = "";
  if (style === 0) tr = `scale(${lerp(1.35, 1.03, E.outExpo(Math.min(1, ct / 8)))})`;
  if (style === 1) tr = `translateX(${lerp(-W * 0.4, 0, E.outExpo(Math.min(1, ct / 6)))}px) scale(1.05)`;
  if (style === 2) tr = `rotate(${lerp(6, 0, E.outExpo(Math.min(1, ct / 6)))}deg) scale(${lerp(1.25, 1.06, E.outExpo(Math.min(1, ct / 6)))})`;
  if (style === 3) tr = `translateY(${lerp(H * 0.35, 0, E.outExpo(Math.min(1, ct / 6)))}px) scale(1.05)`;

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <Chroma amount={impulse(frame, cuts.map((c) => ({ at: c, amp: 7, decay: 4 })))}>
        <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
          <AbsoluteFill style={{ transform: tr }}>
            <Img src={staticFile(thumb(v.id))} style={{ width: W, height: H, objectFit: "cover" }} />
          </AbsoluteFill>
          <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.75) 0%, transparent 45%)" }} />
          <ViewCounter v={v} t={ct} />
        </AbsoluteFill>
      </Chroma>
      <div style={{ position: "absolute", right: 60, top: 50, fontFamily: F.display, fontSize: 90, color: "#fff", opacity: 0.9, textShadow: "6px 6px 0 #4b14a8" }}>
        #{(ci % TOP.length) + 1}
      </div>
      <Flash opacity={impulse(frame, [{ at: s0, amp: 0.7, decay: 4 }])} />
    </AbsoluteFill>
  );
};
