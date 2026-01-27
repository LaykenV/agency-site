import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { loadFont } from "@remotion/google-fonts/Inter";

import { IntroScene } from "./components/IntroScene";
import { MainScene } from "./components/MainScene";
import { OutroScene } from "./components/OutroScene";
import { brandColors } from "./styles/brandColors";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

export interface PromoHorizontalProps {
  heroImage?: string;
  theme?: "light" | "dark";
}

/**
 * PromoHorizontal - 1920x1080, 15 seconds
 * 
 * Structure:
 * - Intro (0-4s): Kinetic headline + typewriter tagline
 * - Main (4-11s): Pain points → Solution + Hero reveal
 * - Outro (11-15s): CTA with animated pricing
 */
export const PromoHorizontal: React.FC<PromoHorizontalProps> = ({
  heroImage = "heroimg.png",
  theme = "light",
}) => {
  const { fps } = useVideoConfig();

  // Scene durations in frames (total = 450 frames = 15s @ 30fps)
  const INTRO_DURATION = 4 * fps; // 120 frames
  const MAIN_DURATION = 7 * fps;  // 210 frames
  const OUTRO_DURATION = 4 * fps; // 120 frames

  // Transition durations
  const TRANSITION_WIPE = Math.round(fps * 0.5); // 15 frames
  const TRANSITION_FADE = Math.round(fps * 0.4); // 12 frames

  return (
    <AbsoluteFill
      style={{
        fontFamily,
        backgroundColor: brandColors.background.dark,
      }}
    >
      <TransitionSeries>
        {/* INTRO SCENE - Kinetic headline */}
        <TransitionSeries.Sequence durationInFrames={INTRO_DURATION}>
          <IntroScene layout="horizontal" theme={theme} />
        </TransitionSeries.Sequence>

        {/* Transition: Wipe from bottom for dramatic reveal */}
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: TRANSITION_WIPE })}
        />

        {/* MAIN SCENE - Pain points + Solution + Hero */}
        <TransitionSeries.Sequence durationInFrames={MAIN_DURATION}>
          <MainScene
            layout="horizontal"
            heroImage={heroImage}
            theme={theme}
          />
        </TransitionSeries.Sequence>

        {/* Transition: Fade for smooth finale */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FADE })}
        />

        {/* OUTRO SCENE - CTA with pricing */}
        <TransitionSeries.Sequence durationInFrames={OUTRO_DURATION}>
          <OutroScene layout="horizontal" theme={theme} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
