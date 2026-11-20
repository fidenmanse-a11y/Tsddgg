import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { thumb, VIDEOS } from "../data/channel";
import { E, map, prog, impulse, shake, lerp, W, H, drift } from "../lib";
import { SEC, ws, we, ls, le, hit, TOTAL } from "../timeline";
import { Advancement, Hotbar, Tooltip, XPBar, PixelCheck } from "../components/minecraft";
import { Chroma, Flash, Vignette, Scanlines } from "../components/fx";
import { F } from "../fonts";

// 0:10 – 0:17  Checkliste im Minecraft-UI.
// "OP-Items? CHECK!" · "Komplett verrückte PvP-Strategien? CHECK!"
// "Und absolut normale SMP-Mitspieler?" … STILLE … "Okay. Vergessen wir das."

type Item = { id: string; q: string; adv: string; lineId: string; checkWord: number };
const ITEMS: Item[] = [
  { id: "Rfj5lAsYpZs", q: "OP-ITEMS?", adv: "OP-Items", lineId: "L05", checkWord: 1 },
  { id: "rAa4f9RQCP8", q: "VERRÜCKTE PVP-STRATEGIEN?", adv: "PvP-Strategien", lineId: "L06", checkWord: 3 },
  { id: "Eq2_E58U2S8", q: "NORMALE SMP-MITSPIELER?", adv: "Normale Mitspieler", lineId: "L07", checkWord: -1 },
];
const HOTBAR = ["thumbs/Rfj5lAsYpZs.jpg", "thumbs/rAa4f9RQCP8.jpg", "thumbs/Eq2_E58U2S8.jpg", "thumbs/QJw0v8rWq90.jpg", "thumbs/cqVsmIshzLc.jpg", "thumbs/WaBZP5Uy2nA.jpg", "thumbs/0c5uPCQwZO0.jpg", "thumbs/tS_BQ12nfjk.jpg", "thumbs/2oXza_81aYY.jpg"];

const PauseIcon: React.FC<{ t: number }> = ({ t }) => (
  <div
    style={{
      position: "absolute",
      left: W / 2 - 90,
      top: H / 2 - 90,
      width: 180,
      height: 180,
      borderRadius: 90,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: 26,
      transform: `scale(${lerp(1.5, 1, E.outExpo(t))})`,
      opacity: Math.min(1, t * 3),
    }}
  >
    <div style={{ width: 26, height: 84, background: "#fff", borderRadius: 4 }} />
    <div style={{ width: 26, height: 84, background: "#fff", borderRadius: 4 }} />
  </div>
);

export const S3Check: React.FC = () => {
  const real = useCurrentFrame();
  const s0 = SEC.check.from;
  const silence = hit("silence");
  const l8 = ls("L08");
  const vergessen = ws("L08", 1);
  const collapse = ws("L08", 3);

  // Freeze-Frame: in der Stille bleibt die Zeit stehen
  const frozen = real >= silence && real < vergessen;
  const frame = frozen ? silence : real;

  // aktives Item
  const starts = [s0, ls("L06") - 4, ls("L07") - 4];
  let cur = 0;
  for (let i = 0; i < 3; i++) if (frame >= starts[i]) cur = i;
  const it = ITEMS[cur];
  const v = VIDEOS[it.id];
  const t = frame - starts[cur];

  const checks = ITEMS.map((x) => (x.checkWord >= 0 ? ws(x.lineId, x.checkWord) : Infinity));
  const nChecked = checks.filter((c) => frame >= c).length;

  const imp = impulse(real, [
    ...checks.filter(isFinite).map((c) => ({ at: c, amp: 0.45, decay: 7 })),
    { at: vergessen, amp: 0.6, decay: 8 },
  ]);
  const sh = shake(real, imp, "s3");
  const ca = impulse(real, checks.filter(isFinite).map((c) => ({ at: c, amp: 9, decay: 6 })));

  // Eintritt pro Item – jedes Mal anders
  let enter: React.CSSProperties = {};
  if (cur === 0) {
    const k = E.outBackSoft(Math.min(1, t / 16));
    enter = { transform: `translateY(${(1 - k) * -H}px)` };
  } else if (cur === 1) {
    const k = E.outExpo(Math.min(1, t / 11));
    enter = { transform: `translateX(${(1 - k) * W * 1.1}px)` };
  } else {
    const k = E.outExpo(Math.min(1, t / 13));
    enter = { transform: `rotate(${(1 - k) * -35}deg) scale(${lerp(0.4, 1, k)})`, transformOrigin: "30% 60%" };
  }
  const whip = cur === 1 && t < 14;

  const d = drift(frame, 1.4, "s3d");
  const tilt = 16 + Math.sin(frame / 40) * 3;

  // Kollaps am Ende ("…vergessen wir DAS.")
  const fall = prog(real, collapse, 22, E.inCubic);

  const scene = (
    <AbsoluteFill style={{ ...enter }}>
      <AbsoluteFill style={{ transform: `scale(${1 + Math.min(t, 150) * 0.00035})`, transformOrigin: "50% 50%" }}>
      {/* Hintergrund: echtes Thumbnail, unscharf, violett getönt */}
      <Img
        src={staticFile(thumb(it.id))}
        style={{ position: "absolute", width: W, height: H, objectFit: "cover", filter: "blur(26px) brightness(0.45) saturate(1.3)", transform: "scale(1.15)" }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(120deg, rgba(40,5,90,0.55), rgba(5,0,15,0.75))" }} />

      {/* Frage */}
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 70,
          fontFamily: F.display,
          fontSize: cur === 0 ? 150 : 100,
          maxWidth: 1060,
          color: "#fff",
          lineHeight: 1,
          textShadow: "8px 8px 0 #2a0a5e",
          transform: `translateY(${(1 - E.outExpo(Math.min(1, t / 10))) * 60}px)`,
        }}
      >
        {it.q}
      </div>

      {/* Thumbnail als "Item" in 3D */}
      <div style={{ position: "absolute", left: 110 + d.x, top: 300 + d.y, perspective: 1600 }}>
        <div
          style={{
            width: 900,
            height: 506,
            transform: `rotateY(${tilt}deg) rotateX(${4 + Math.sin(frame / 55) * 2}deg)`,
            boxShadow: "30px 40px 80px rgba(0,0,0,0.6)",
            border: "10px solid #1b1b1b",
            outline: "6px solid #6f6f6f",
          }}
        >
          <Img src={staticFile(thumb(it.id))} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </div>

      {/* Tooltip mit echtem Titel + echten Aufrufen */}
      <div style={{ position: "absolute", left: 1050, top: 500 + d.y * 0.5, opacity: prog(frame, starts[cur] + 6, 6) }}>
        <Tooltip
          scale={0.92}
          title={v.title}
          lines={[
            { text: `${v.views} Aufrufe`, color: "#55ffff" },
            { text: v.collab ?? "Revanchie", color: "#aaaaaa" },
            { text: `Länge: ${v.duration}`, color: "#555555" },
          ]}
          style={{ maxWidth: 700 }}
        />
      </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );

  // Toasts
  const toastY = (i: number) => 40 + i * 146;
  const toasts = ITEMS.map((x, i) => {
    const appear = x.checkWord >= 0 ? checks[i] : ws("L07", 3);
    if (frame < appear - 2) return null;
    const k = E.outExpo(Math.min(1, (frame - appear + 2) / 10));
    const state: "done" | "pending" | "failed" = i < 2 ? "done" : real >= vergessen ? "failed" : "pending";
    const failShake = i === 2 ? shake(real, impulse(real, [{ at: vergessen, amp: 0.8, decay: 7 }]), "t3").x : 0;
    const exit = i === 2 ? prog(real, collapse + 6, 12, E.inCubic) : 0;
    return (
      <div key={i} style={{ position: "absolute", right: 40 - (1 - k) * 720 - exit * 800 + failShake, top: toastY(i) }}>
        <Advancement title={x.adv} icon={thumb(x.id)} state={state} spin={frame * 12} />
      </div>
    );
  });

  // CHECK!-Stempel
  const stampIdx = cur < 2 && frame >= checks[cur] ? cur : -1;
  const st = stampIdx >= 0 ? frame - checks[stampIdx] : 0;

  const ui = (
    <>
      {/* XP + Hotbar */}
      <div style={{ position: "absolute", left: W / 2 - 500, top: 912 }}>
        <XPBar fill={map(frame, [checks[0], checks[0] + 14, checks[1], checks[1] + 14], [0.15, 0.7, 0.7, 1], E.outCubic)} level={nChecked * 15 + 15} />
      </div>
      <div style={{ position: "absolute", left: W / 2 - (9 * 96 + 8) / 2, top: 958 }}>
        <Hotbar items={HOTBAR} selected={cur} scale={1} />
      </div>
      {toasts}
      {stampIdx >= 0 && (
        <div
          style={{
            position: "absolute",
            left: 980,
            top: 150,
            display: "flex",
            alignItems: "center",
            gap: 20,
            transform: `rotate(-9deg) scale(${lerp(2.4, 1, E.outExpo(Math.min(1, st / 8)))})`,
            opacity: Math.min(1, st / 3),
            fontFamily: F.mc,
            fontWeight: 700,
            fontSize: 150,
            color: "#55ff55",
            textShadow: "8px 8px 0 #153f15",
          }}
        >
          <PixelCheck size={150} />
          CHECK!
        </div>
      )}
    </>
  );

  const desat = frozen ? 1 : real >= vergessen ? Math.max(0, 1 - (real - vergessen) / 10) : 0;

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${sh.x}px, ${sh.y + fall * 1400}px) rotate(${sh.r + fall * 14}deg)`,
          filter: desat > 0 ? `saturate(${1 - desat * 0.85}) brightness(${1 - desat * 0.35})` : undefined,
        }}
      >
        <Chroma amount={ca}>
          {whip ? (
            <CameraMotionBlur samples={6} shutterAngle={200}>
              {scene}
            </CameraMotionBlur>
          ) : (
            scene
          )}
          {ui}
        </Chroma>
      </AbsoluteFill>
      {frozen && (
        <>
          <Scanlines opacity={0.18} />
          <Vignette strength={0.7} />
          <PauseIcon t={(real - silence) / 12} />
          {/* YouTube-Player-Fortschrittsbalken während des Freeze */}
          <div style={{ position: "absolute", left: 40, right: 40, bottom: 34, height: 7, background: "rgba(255,255,255,0.25)" }}>
            <div style={{ width: "38%", height: "100%", background: "#ff0033" }} />
            <div style={{ position: "absolute", left: "38%", top: -7, width: 21, height: 21, marginLeft: -10, borderRadius: 11, background: "#ff0033" }} />
          </div>
          <div style={{ position: "absolute", left: 40, bottom: 56, fontFamily: F.yt, fontSize: 26, color: "#fff" }}>
            ❚❚ &nbsp; 0:{String(Math.floor(silence / 60)).padStart(2, "0")} / 0:{Math.round(TOTAL / 60)}
          </div>
        </>
      )}
      <Flash opacity={impulse(real, checks.filter(isFinite).map((c) => ({ at: c, amp: 0.35, decay: 3 })))} />
      {/* Ende: Rest fällt weg -> Schwarz */}
      <AbsoluteFill style={{ background: "#000", opacity: map(real, [SEC.check.to - 4, SEC.check.to], [0, 1]) }} />
    </AbsoluteFill>
  );
};
