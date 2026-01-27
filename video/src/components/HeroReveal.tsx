import React from "react";
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface HeroRevealProps {
  imageSrc: string;
  width?: number;
  startFrame?: number;
  direction?: "left" | "right" | "top" | "bottom";
  enableTilt?: boolean;
  enableFloat?: boolean;
  borderRadius?: number;
  shadowIntensity?: number;
}

export const HeroReveal: React.FC<HeroRevealProps> = ({
  imageSrc,
  width = 850,
  startFrame = 0,
  direction = "right",
  enableTilt = true,
  enableFloat = true,
  borderRadius = 20,
  shadowIntensity = 0.4,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;

  // Entry animation
  const entryProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  // Mask wipe animation
  const maskProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 200 },
    durationInFrames: 25,
  });

  // Floating animation
  const floatOffset = enableFloat
    ? Math.sin(frame * 0.03) * 8
    : 0;

  // 3D tilt effect
  const tiltX = enableTilt
    ? interpolate(Math.sin(frame * 0.02), [-1, 1], [-2, 2])
    : 0;
  const tiltY = enableTilt
    ? interpolate(Math.cos(frame * 0.015), [-1, 1], [-1, 1])
    : 0;

  // Scale animation
  const scale = interpolate(entryProgress, [0, 1], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Entry direction offset
  const getEntryOffset = () => {
    const offset = interpolate(entryProgress, [0, 1], [100, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    switch (direction) {
      case "left":
        return { x: -offset, y: 0 };
      case "right":
        return { x: offset, y: 0 };
      case "top":
        return { x: 0, y: -offset };
      case "bottom":
        return { x: 0, y: offset };
    }
  };

  const { x: entryX, y: entryY } = getEntryOffset();

  // Mask clip path based on wipe direction
  const getClipPath = () => {
    const reveal = maskProgress * 100;
    switch (direction) {
      case "left":
        return `inset(0 ${100 - reveal}% 0 0)`;
      case "right":
        return `inset(0 0 0 ${100 - reveal}%)`;
      case "top":
        return `inset(0 0 ${100 - reveal}% 0)`;
      case "bottom":
        return `inset(${100 - reveal}% 0 0 0)`;
    }
  };

  const opacity = interpolate(entryProgress, [0, 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "relative",
        transform: `
          translate(${entryX}px, ${entryY + floatOffset}px)
          scale(${scale})
          perspective(1000px)
          rotateX(${tiltX}deg)
          rotateY(${tiltY}deg)
        `,
        opacity,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Shadow layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius,
          boxShadow: `0 40px 80px rgba(0, 0, 0, ${shadowIntensity})`,
          transform: "translateZ(-10px)",
        }}
      />

      {/* Image container with mask */}
      <div
        style={{
          width,
          borderRadius,
          overflow: "hidden",
          clipPath: getClipPath(),
          transition: "clip-path 0s",
        }}
      >
        <Img
          src={staticFile(imageSrc)}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
        />
      </div>

      {/* Shine overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius,
          background: `linear-gradient(
            135deg,
            rgba(255, 255, 255, ${0.1 * maskProgress}) 0%,
            transparent 50%
          )`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

// Browser frame wrapper for hero images
interface BrowserFrameProps {
  children: React.ReactNode;
  width?: number;
  showDots?: boolean;
  backgroundColor?: string;
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  children,
  width = 850,
  showDots = true,
  backgroundColor = "#1a1a1a",
}) => {
  return (
    <div
      style={{
        width,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor,
        boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Browser bar */}
      <div
        style={{
          height: 32,
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
          gap: 6,
        }}
      >
        {showDots && (
          <>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: "#ff5f57",
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: "#ffbd2e",
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: "#28ca42",
              }}
            />
          </>
        )}
      </div>
      {/* Content */}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
};
