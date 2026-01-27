import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { KineticHeadline } from "./KineticText";
import { FloatingOrbs } from "./FloatingOrbs";
import { brandColors, gradients } from "../styles/brandColors";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

interface IntroSceneProps {
  layout: "horizontal" | "vertical";
  theme?: "light" | "dark";
}

// Typewriter tagline component
const TypewriterTagline: React.FC<{
  text: string;
  startFrame: number;
  charFrames?: number;
  fontSize?: number;
}> = ({ text, startFrame, charFrames = 2, fontSize = 32 }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  if (localFrame < 0) return null;

  const typedChars = Math.min(
    text.length,
    Math.floor(localFrame / charFrames)
  );
  const typedText = text.slice(0, typedChars);

  // Blinking cursor
  const cursorOpacity = interpolate(
    (localFrame % 16),
    [0, 8, 16],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const showCursor = typedChars < text.length;

  return (
    <div
      style={{
        fontFamily,
        fontSize,
        fontWeight: 500,
        color: "rgba(255, 255, 255, 0.7)",
      }}
    >
      <span>{typedText}</span>
      {showCursor && (
        <span style={{ opacity: cursorOpacity }}>|</span>
      )}
    </div>
  );
};

export const IntroScene: React.FC<IntroSceneProps> = ({
  layout,
  theme = "light",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isHorizontal = layout === "horizontal";

  // Animation timing
  const taglineStart = 45; // Start typewriter after headline

  // Container fade in
  const containerOpacity = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const headlineLines = [
    { text: "Your Website.", color: "#ffffff" },
    {
      text: "Your Web Team.",
      color: brandColors.primary,
      highlightWords: ["Team"],
    },
  ];

  return (
    <AbsoluteFill
      style={{
        background: gradients.primaryDark,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        opacity: containerOpacity,
      }}
    >
      {/* Floating orbs background */}
      <FloatingOrbs
        count={6}
        colors={[
          brandColors.primary,
          brandColors.accent,
          brandColors.highlight,
        ]}
        minSize={isHorizontal ? 300 : 200}
        maxSize={isHorizontal ? 700 : 500}
        speedMultiplier={0.8}
      />

      {/* Radial glow behind text */}
      <div
        style={{
          position: "absolute",
          width: isHorizontal ? 1000 : 600,
          height: isHorizontal ? 600 : 400,
          background: gradients.primaryGlow(0.2),
          filter: "blur(60px)",
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isHorizontal ? 40 : 30,
          textAlign: "center",
          zIndex: 1,
          padding: isHorizontal ? 80 : 50,
        }}
      >
        {/* Kinetic headline */}
        <KineticHeadline
          lines={headlineLines}
          fontSize={isHorizontal ? 88 : 64}
          fontWeight={800}
          defaultColor="#ffffff"
          highlightColor={brandColors.accent}
          staggerDelay={4}
          lineDelay={10}
          direction="up"
          startFrame={5}
          textAlign="center"
        />

        {/* Typewriter tagline */}
        <TypewriterTagline
          text="Website-as-a-Service for local businesses"
          startFrame={taglineStart}
          charFrames={2}
          fontSize={isHorizontal ? 32 : 24}
        />
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          position: "absolute",
          bottom: isHorizontal ? 60 : 120,
          width: interpolate(
            spring({ frame: frame - 60, fps, config: { damping: 200 } }),
            [0, 1],
            [0, isHorizontal ? 200 : 120],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          ),
          height: 4,
          backgroundColor: brandColors.highlight,
          borderRadius: 2,
        }}
      />
    </AbsoluteFill>
  );
};
