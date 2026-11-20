import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { FONT_SPECS } from "./fonts";
import { SEC } from "./timeline";
import { S1Open } from "./scenes/S1Open";
import { S2Drop } from "./scenes/S2Drop";
import { S3Check } from "./scenes/S3Check";
import { S4Chaos } from "./scenes/S4Chaos";
import { S5Epic } from "./scenes/S5Epic";
import { S6Final } from "./scenes/S6Final";

// Alle Szenen arbeiten mit globalen Frames (siehe timeline.ts),
// damit Bild, Stimme, Musik und SFX dieselbe Zeitachse teilen.

export const Promo: React.FC = () => {
  const f = useCurrentFrame();
  // Schriften vollständig laden, bevor ein Frame fotografiert wird
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(FONT_SPECS.map((spec) => document.fonts.load(spec)))
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
  const inS = (k: keyof typeof SEC) => f >= SEC[k].from && f < SEC[k].to;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {inS("open") && <S1Open />}
      {inS("drop") && <S2Drop />}
      {inS("check") && <S3Check />}
      {inS("chaos") && <S4Chaos />}
      {inS("epic") && <S5Epic />}
      {(inS("final") || inS("end")) && <S6Final />}
      <Audio src={staticFile("audio/master.wav")} />
    </AbsoluteFill>
  );
};
