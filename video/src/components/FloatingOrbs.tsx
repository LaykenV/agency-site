import React from "react";
import { useCurrentFrame } from "remotion";
import { brandColors } from "../styles/brandColors";

interface OrbConfig {
  size: number;
  x: number; // percentage
  y: number; // percentage
  color: string;
  speed: number;
  amplitude: number;
  phase: number;
  opacity: number;
}

interface FloatingOrbsProps {
  count?: number;
  colors?: string[];
  minSize?: number;
  maxSize?: number;
  speedMultiplier?: number;
}

const generateOrbs = (
  count: number,
  colors: string[],
  minSize: number,
  maxSize: number
): OrbConfig[] => {
  const orbs: OrbConfig[] = [];

  for (let i = 0; i < count; i++) {
    // Use deterministic pseudo-random based on index
    const seed = (i * 137.5) % 100;
    const seed2 = (i * 73.2) % 100;
    const seed3 = (i * 29.1) % 100;

    orbs.push({
      size: minSize + ((seed / 100) * (maxSize - minSize)),
      x: (seed2 / 100) * 100,
      y: (seed3 / 100) * 100,
      color: colors[i % colors.length],
      speed: 0.015 + (seed / 100) * 0.02,
      amplitude: 20 + (seed2 / 100) * 40,
      phase: (i * Math.PI) / count,
      opacity: 0.15 + (seed3 / 100) * 0.2,
    });
  }

  return orbs;
};

export const FloatingOrbs: React.FC<FloatingOrbsProps> = ({
  count = 5,
  colors = [brandColors.primary, brandColors.accent, brandColors.highlight],
  minSize = 200,
  maxSize = 600,
  speedMultiplier = 1,
}) => {
  const frame = useCurrentFrame();
  const orbs = React.useMemo(
    () => generateOrbs(count, colors, minSize, maxSize),
    [count, colors, minSize, maxSize]
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {orbs.map((orb, index) => {
        const xOffset =
          Math.sin(frame * orb.speed * speedMultiplier + orb.phase) *
          orb.amplitude;
        const yOffset =
          Math.cos(frame * orb.speed * speedMultiplier * 0.7 + orb.phase) *
          orb.amplitude *
          0.6;
        const scaleBreath =
          1 + Math.sin(frame * orb.speed * 0.5 + orb.phase) * 0.1;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              width: orb.size,
              height: orb.size,
              left: `${orb.x}%`,
              top: `${orb.y}%`,
              transform: `translate(-50%, -50%) translate(${xOffset}px, ${yOffset}px) scale(${scaleBreath})`,
              background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
              opacity: orb.opacity,
              filter: "blur(40px)",
            }}
          />
        );
      })}
    </div>
  );
};

// Particle burst effect for CTAs
interface ParticleBurstProps {
  particleCount?: number;
  color?: string;
  startFrame?: number;
  duration?: number;
}

export const ParticleBurst: React.FC<ParticleBurstProps> = ({
  particleCount = 20,
  color = brandColors.highlight,
  startFrame = 0,
  duration = 30,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  if (localFrame < 0 || localFrame > duration) {
    return null;
  }

  const progress = localFrame / duration;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {Array.from({ length: particleCount }).map((_, i) => {
        const angle = (i / particleCount) * Math.PI * 2;
        const distance = 50 + progress * 200;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const size = 4 + (i % 3) * 2;
        const opacity = 1 - progress;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: color,
              transform: `translate(${x}px, ${y}px)`,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
};
