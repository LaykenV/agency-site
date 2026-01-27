import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Inter";

import { IntroScene } from "./components/IntroScene";
import { MainScene } from "./components/MainScene";
import { OutroScene } from "./components/OutroScene";
import { brandColors } from "./styles/brandColors";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

export interface PromoVerticalProps {
  heroImage?: string;
  theme?: "light" | "dark";
}

/**
 * PromoVertical - 1080x1920 (9:16), 15 seconds
 * 
 * Optimized for TikTok, Instagram Reels, YouTube Shorts
 * 
 * Structure:
 * - Intro (0-4s): Kinetic headline + typewriter tagline
 * - Main (4-11s): Pain points → Solution + Hero reveal
 * - Outro (11-15s): CTA with animated pricing
 */
export const PromoVertical: React.FC<PromoVerticalProps> = ({
  heroImage = "heroimg.png",
  theme = "light",
}) => {
  const { fps } = useVideoConfig();

  // Scene durations in frames (total = 450 frames = 15s @ 30fps)
  const INTRO_DURATION = 4 * fps; // 120 frames
  const MAIN_DURATION = 7 * fps;  // 210 frames
  const OUTRO_DURATION = 4 * fps; // 120 frames

  // Transition durations
  const TRANSITION_SLIDE = Math.round(fps * 0.4); // 12 frames
  const TRANSITION_FADE = Math.round(fps * 0.4);  // 12 frames

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
          <IntroScene layout="vertical" theme={theme} />
        </TransitionSeries.Sequence>

        {/* Transition: Slide from bottom for vertical feel */}
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: TRANSITION_SLIDE })}
        />

        {/* MAIN SCENE - Pain points + Solution + Hero */}
        <TransitionSeries.Sequence durationInFrames={MAIN_DURATION}>
          <MainScene
            layout="vertical"
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
          <OutroScene layout="vertical" theme={theme} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
