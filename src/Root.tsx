import React from "react";
import { Composition } from "remotion";
import { Promo } from "./Promo";
import { FPS, W, H } from "./lib";
import { TOTAL } from "./timeline";
import "./fonts";

export const RemotionRoot: React.FC = () => (
  <Composition id="RevanchiePromo" component={Promo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
);
