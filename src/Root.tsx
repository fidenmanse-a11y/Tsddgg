import React from "react";
import { Composition } from "remotion";
import { Promo } from "./Promo";
import { FPS, W, H } from "./lib";
import { TOTAL } from "./timeline";
import "./fonts";
import { Short, SHORT_FRAMES, SW, SH } from "./short/Short";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="RevanchiePromo" component={Promo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
    <Composition id="RevanchieShort" component={Short} durationInFrames={SHORT_FRAMES} fps={FPS} width={SW} height={SH} />
  </>
);
