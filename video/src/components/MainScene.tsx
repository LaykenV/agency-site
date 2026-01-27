import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { brandColors, gradients, getThemeColors } from "../styles/brandColors";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

interface MainSceneProps {
  layout: "horizontal" | "vertical";
  heroImage: string;
  theme?: "light" | "dark";
}

// Animated line that slides in and optionally gets struck through
interface AnimatedLineProps {
  icon: string;
  text: string;
  index: number;
  direction: "left" | "right";
  strikeThrough?: boolean;
  strikeDelay?: number;
}

const AnimatedLine: React.FC<AnimatedLineProps> = ({
  icon,
  text,
  index,
  direction,
  strikeThrough = true,
  strikeDelay = 20,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entryDelay = index * 12;

  // Entry animation
  const entryProgress = spring({
    frame: frame - entryDelay,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const entryOffset = interpolate(entryProgress, [0, 1], [direction === "left" ? -100 : 100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(entryProgress, [0, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Strike-through animation
  const strikeProgress = strikeThrough
    ? spring({
        frame: frame - entryDelay - strikeDelay,
        fps,
        config: { damping: 200 },
        durationInFrames: 15,
      })
    : 0;

  const strikeWidth = interpolate(strikeProgress, [0, 1], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out after strike
  const fadeOut = strikeThrough
    ? interpolate(
        frame - entryDelay - strikeDelay - 20,
        [0, 15],
        [1, 0.4],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 1;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        transform: `translateX(${entryOffset}px)`,
        opacity: opacity * fadeOut,
        position: "relative",
      }}
    >
      <span style={{ fontSize: 44 }}>{icon}</span>
      <span
        style={{
          fontFamily,
          fontSize: 32,
          fontWeight: 600,
          color: "#ffffff",
          position: "relative",
        }}
      >
        {text}
        {/* Strike-through line */}
        {strikeThrough && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              width: `${strikeWidth}%`,
              height: 3,
              backgroundColor: brandColors.highlight,
              transform: "translateY(-50%)",
              borderRadius: 2,
            }}
          />
        )}
      </span>
    </div>
  );
};

// Solution reveal with badge
const SolutionReveal: React.FC<{
  startFrame: number;
  layout: "horizontal" | "vertical";
}> = ({ startFrame, layout }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  const isHorizontal = layout === "horizontal";

  const textEntry = spring({
    frame: localFrame,
    fps,
    config: { damping: 200 },
  });

  const badgeEntry = spring({
    frame: localFrame - 15,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const textOpacity = interpolate(textEntry, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
  });
  const textY = interpolate(textEntry, [0, 1], [30, 0], {
    extrapolateLeft: "clamp",
  });

  const badgeScale = interpolate(badgeEntry, [0, 1], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const badgeOpacity = interpolate(badgeEntry, [0, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isHorizontal ? "flex-start" : "center",
        gap: 30,
      }}
    >
      {/* Main headline */}
      <div
        style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
        }}
      >
        <h2
          style={{
            fontFamily,
            fontSize: isHorizontal ? 72 : 52,
            fontWeight: 800,
            color: "#ffffff",
            margin: 0,
            lineHeight: 1.1,
            textAlign: isHorizontal ? "left" : "center",
          }}
        >
          We build it.
          <br />
          <span style={{ color: brandColors.primary }}>We run it.</span>
          <br />
          You grow.
        </h2>
      </div>

      {/* Price badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 16,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          padding: "16px 32px",
          borderRadius: 60,
          border: "1px solid rgba(255, 255, 255, 0.2)",
          transform: `scale(${badgeScale})`,
          opacity: badgeOpacity,
        }}
      >
        <span
          style={{
            fontFamily,
            fontSize: 24,
            fontWeight: 600,
            color: brandColors.highlight,
          }}
        >
          $0 Down
        </span>
        <span style={{ color: "rgba(255, 255, 255, 0.3)" }}>•</span>
        <span
          style={{
            fontFamily,
            fontSize: 24,
            fontWeight: 700,
            color: "#ffffff",
          }}
        >
          $199/mo
        </span>
      </div>
    </div>
  );
};

export const MainScene: React.FC<MainSceneProps> = ({
  layout,
  heroImage,
  theme = "light",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const isHorizontal = layout === "horizontal";

  // Pain points that get struck through
  const painPoints = [
    { icon: "🐌", text: "Slow loading speeds" },
    { icon: "📱", text: "Not mobile-friendly" },
    { icon: "🔧", text: "Can't make updates" },
  ];

  // Phase timing (relative to scene start)
  const painPhaseEnd = 80; // Pain points visible for ~2.7s
  const solutionStart = painPhaseEnd - 10; // Solution starts fading in
  const heroStart = solutionStart + 30; // Hero image appears

  // Pain points fade out
  const painFadeOut = interpolate(
    frame,
    [painPhaseEnd - 20, painPhaseEnd],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Hero image animation
  const heroEntry = spring({
    frame: frame - heroStart,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const heroScale = interpolate(heroEntry, [0, 1], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const heroOpacity = interpolate(heroEntry, [0, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
  });
  const heroFloat = Math.sin(frame * 0.03) * 8;

  return (
    <AbsoluteFill
      style={{
        background: gradients.primaryDark,
        fontFamily,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 1000,
          height: 600,
          background: gradients.primaryGlow(0.15),
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(80px)",
        }}
      />

      {isHorizontal ? (
        // Horizontal layout: Left text, right hero
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            padding: 80,
          }}
        >
          {/* Left side */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 24,
              zIndex: 2,
            }}
          >
            {/* Pain points phase */}
            {frame < painPhaseEnd && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  opacity: painFadeOut,
                }}
              >
                <h3
                  style={{
                    fontFamily,
                    fontSize: 48,
                    fontWeight: 700,
                    color: "#ffffff",
                    marginBottom: 20,
                  }}
                >
                  Sound familiar?
                </h3>
                {painPoints.map((point, index) => (
                  <AnimatedLine
                    key={index}
                    icon={point.icon}
                    text={point.text}
                    index={index}
                    direction={index % 2 === 0 ? "left" : "right"}
                    strikeThrough={true}
                    strikeDelay={25}
                  />
                ))}
              </div>
            )}

            {/* Solution phase */}
            {frame >= solutionStart && (
              <SolutionReveal startFrame={solutionStart} layout={layout} />
            )}
          </div>

          {/* Right side - Hero image */}
          {frame >= heroStart && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  transform: `translateY(${heroFloat}px) scale(${heroScale})`,
                  opacity: heroOpacity,
                }}
              >
                <div
                  style={{
                    width: 750,
                    borderRadius: 20,
                    overflow: "hidden",
                    boxShadow: "0 40px 80px rgba(0, 0, 0, 0.4)",
                  }}
                >
                  <Img
                    src={staticFile(heroImage)}
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Vertical layout: Stacked
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            padding: 50,
            justifyContent: "center",
            alignItems: "center",
            gap: 40,
          }}
        >
          {/* Pain points phase */}
          {frame < painPhaseEnd && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                alignItems: "center",
                opacity: painFadeOut,
              }}
            >
              <h3
                style={{
                  fontFamily,
                  fontSize: 40,
                  fontWeight: 700,
                  color: "#ffffff",
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                Sound familiar?
              </h3>
              {painPoints.map((point, index) => (
                <AnimatedLine
                  key={index}
                  icon={point.icon}
                  text={point.text}
                  index={index}
                  direction={index % 2 === 0 ? "left" : "right"}
                  strikeThrough={true}
                  strikeDelay={25}
                />
              ))}
            </div>
          )}

          {/* Solution phase */}
          {frame >= solutionStart && (
            <>
              <SolutionReveal startFrame={solutionStart} layout={layout} />

              {/* Hero image */}
              {frame >= heroStart && (
                <div
                  style={{
                    transform: `translateY(${heroFloat}px) scale(${heroScale})`,
                    opacity: heroOpacity,
                  }}
                >
                  <div
                    style={{
                      width: 900,
                      borderRadius: 16,
                      overflow: "hidden",
                      boxShadow: "0 30px 60px rgba(0, 0, 0, 0.4)",
                    }}
                  >
                    <Img
                      src={staticFile(heroImage)}
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};
