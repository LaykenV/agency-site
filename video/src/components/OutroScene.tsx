import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { brandColors, gradients } from "../styles/brandColors";
import { ParticleBurst } from "./FloatingOrbs";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

interface OutroSceneProps {
  layout: "horizontal" | "vertical";
  theme?: "light" | "dark";
}

// Animated counter for pricing
const AnimatedPrice: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  startFrame?: number;
  duration?: number;
  fontSize?: number;
}> = ({
  value,
  prefix = "$",
  suffix = "",
  startFrame = 0,
  duration = 30,
  fontSize = 64,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  if (localFrame < 0) {
    return (
      <span style={{ fontSize, fontWeight: 900, color: "#ffffff" }}>
        {prefix}0{suffix}
      </span>
    );
  }

  const progress = Math.min(1, localFrame / duration);
  // Eased progress for smooth counting
  const easedProgress = 1 - Math.pow(1 - progress, 3);
  const displayValue = Math.round(easedProgress * value);

  return (
    <span style={{ fontSize, fontWeight: 900, color: "#ffffff" }}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
};

// Pulsing CTA button
const PulsingCTA: React.FC<{
  text: string;
  startFrame?: number;
  fontSize?: number;
}> = ({ text, startFrame = 0, fontSize = 32 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;

  // Entry animation
  const entryProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const entryScale = interpolate(entryProgress, [0, 1], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entryOpacity = interpolate(entryProgress, [0, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
  });

  // Continuous pulse after entry
  const pulsePhase = Math.max(0, localFrame - 20);
  const pulse = 1 + Math.sin(pulsePhase * 0.15) * 0.04;

  // Glow pulse
  const glowIntensity = 0.4 + Math.sin(pulsePhase * 0.12) * 0.15;

  return (
    <div
      style={{
        position: "relative",
        transform: `scale(${entryScale * pulse})`,
        opacity: entryOpacity,
      }}
    >
      {/* Glow layer */}
      <div
        style={{
          position: "absolute",
          inset: -20,
          background: gradients.highlightGlow(glowIntensity),
          filter: "blur(30px)",
          borderRadius: 80,
        }}
      />

      {/* Button */}
      <div
        style={{
          position: "relative",
          background: gradients.cta,
          color: "#ffffff",
          fontFamily,
          fontSize,
          fontWeight: 700,
          padding: "22px 60px",
          borderRadius: 60,
          boxShadow: `0 10px 40px hsla(150, 65%, 40%, 0.5)`,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {text}
        <span style={{ fontSize: fontSize * 0.9 }}>→</span>
      </div>
    </div>
  );
};

// Floating particles background for outro
const OutroParticles: React.FC = () => {
  const frame = useCurrentFrame();

  const particles = Array.from({ length: 20 }).map((_, i) => {
    const seed = (i * 137.5) % 100;
    const seed2 = (i * 73.2) % 100;
    return {
      x: seed,
      y: ((seed2 + frame * (0.3 + (i % 3) * 0.2)) % 120) - 10,
      size: 4 + (i % 4) * 2,
      opacity: 0.2 + (seed / 100) * 0.2,
    };
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: brandColors.primary,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
};

export const OutroScene: React.FC<OutroSceneProps> = ({
  layout,
  theme = "light",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isHorizontal = layout === "horizontal";

  // Main content entry
  const mainEntry = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const mainScale = interpolate(mainEntry, [0, 1], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const mainOpacity = interpolate(mainEntry, [0, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
  });

  // Price entry
  const priceEntry = spring({
    frame: frame - 15,
    fps,
    config: { damping: 200 },
  });

  const priceOpacity = interpolate(priceEntry, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
  });
  const priceY = interpolate(priceEntry, [0, 1], [20, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, hsl(222, 72%, 28%) 0%, hsl(210, 55%, 15%) 100%)",
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
      }}
    >
      {/* Animated particles */}
      <OutroParticles />

      {/* Central glow */}
      <div
        style={{
          position: "absolute",
          width: isHorizontal ? 800 : 600,
          height: isHorizontal ? 800 : 600,
          borderRadius: "50%",
          background: gradients.primaryGlow(0.25),
          filter: "blur(80px)",
        }}
      />

      {/* Particle burst on CTA */}
      <ParticleBurst
        particleCount={24}
        color={brandColors.highlight}
        startFrame={40}
        duration={40}
      />

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isHorizontal ? 40 : 30,
          zIndex: 1,
          transform: `scale(${mainScale})`,
          opacity: mainOpacity,
        }}
      >
        {/* Headline */}
        <h2
          style={{
            fontFamily,
            fontSize: isHorizontal ? 80 : 52,
            fontWeight: 800,
            color: "#ffffff",
            margin: 0,
            textAlign: "center",
            letterSpacing: -2,
          }}
        >
          Ready to stand out?
        </h2>

        {/* Pricing */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            opacity: priceOpacity,
            transform: `translateY(${priceY}px)`,
          }}
        >
          {/* $0 Down badge */}
          <div
            style={{
              backgroundColor: brandColors.highlight,
              color: "#ffffff",
              fontFamily,
              fontSize: isHorizontal ? 28 : 22,
              fontWeight: 700,
              padding: "12px 32px",
              borderRadius: 40,
            }}
          >
            $0 DOWN
          </div>

          {/* Animated price */}
          <AnimatedPrice
            value={199}
            prefix="$"
            startFrame={20}
            duration={25}
            fontSize={isHorizontal ? 64 : 48}
          />

          <span
            style={{
              fontFamily,
              fontSize: isHorizontal ? 32 : 24,
              fontWeight: 600,
              color: brandColors.primary,
            }}
          >
            /month
          </span>
        </div>

        {/* CTA Button */}
        <PulsingCTA
          text="Get Started"
          startFrame={35}
          fontSize={isHorizontal ? 32 : 26}
        />

        {/* Subtext */}
        <p
          style={{
            fontFamily,
            fontSize: isHorizontal ? 22 : 18,
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.6)",
            marginTop: 10,
          }}
        >
          12-month commitment • Cancel anytime after
        </p>
      </div>
    </AbsoluteFill>
  );
};
