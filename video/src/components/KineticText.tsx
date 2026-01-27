import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brandColors } from "../styles/brandColors";

type AnimationDirection = "up" | "down" | "left" | "right";

interface KineticTextProps {
  text: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  highlightWords?: string[];
  highlightColor?: string;
  staggerDelay?: number;
  direction?: AnimationDirection;
  startFrame?: number;
  lineHeight?: number;
  letterSpacing?: number;
}

const getDirectionOffset = (
  direction: AnimationDirection,
  progress: number
): { x: number; y: number } => {
  const offset = interpolate(progress, [0, 1], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  switch (direction) {
    case "up":
      return { x: 0, y: offset };
    case "down":
      return { x: 0, y: -offset };
    case "left":
      return { x: offset, y: 0 };
    case "right":
      return { x: -offset, y: 0 };
  }
};

interface WordHighlightProps {
  word: string;
  color: string;
  delay: number;
  fontSize: number;
  fontWeight: number;
  textColor: string;
}

const WordHighlight: React.FC<WordHighlightProps> = ({
  word,
  color,
  delay,
  fontSize,
  fontWeight,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const highlightProgress = spring({
    fps,
    frame,
    config: { damping: 200 },
    delay,
    durationInFrames: 18,
  });

  const scaleX = Math.max(0, Math.min(1, highlightProgress));

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: -4,
          right: -4,
          top: "50%",
          height: "1.1em",
          transform: `translateY(-50%) scaleX(${scaleX})`,
          transformOrigin: "left center",
          backgroundColor: color,
          borderRadius: "0.15em",
          zIndex: 0,
        }}
      />
      <span
        style={{
          position: "relative",
          zIndex: 1,
          fontSize,
          fontWeight,
          color: textColor,
        }}
      >
        {word}
      </span>
    </span>
  );
};

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  fontSize = 72,
  fontWeight = 800,
  color = "#ffffff",
  highlightWords = [],
  highlightColor = brandColors.primary,
  staggerDelay = 5,
  direction = "up",
  startFrame = 0,
  lineHeight = 1.15,
  letterSpacing = -2,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = text.split(" ");

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.25em",
        lineHeight,
        letterSpacing,
      }}
    >
      {words.map((word, index) => {
        const wordStartFrame = startFrame + index * staggerDelay;
        const wordProgress = spring({
          frame: frame - wordStartFrame,
          fps,
          config: { damping: 15, stiffness: 120 },
        });

        const { x, y } = getDirectionOffset(direction, wordProgress);
        const opacity = interpolate(wordProgress, [0, 0.5], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const scale = interpolate(wordProgress, [0, 1], [0.8, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const isHighlighted = highlightWords.some(
          (hw) => word.toLowerCase().includes(hw.toLowerCase())
        );
        const highlightDelay = wordStartFrame + 15;

        return (
          <span
            key={index}
            style={{
              display: "inline-block",
              transform: `translate(${x}px, ${y}px) scale(${scale})`,
              opacity,
              fontSize,
              fontWeight,
              color,
              whiteSpace: "pre",
            }}
          >
            {isHighlighted ? (
              <WordHighlight
                word={word}
                color={highlightColor}
                delay={highlightDelay}
                fontSize={fontSize}
                fontWeight={fontWeight}
                textColor={color}
              />
            ) : (
              word
            )}
          </span>
        );
      })}
    </div>
  );
};

// Multi-line kinetic text for headlines
interface KineticHeadlineProps {
  lines: Array<{
    text: string;
    color?: string;
    highlightWords?: string[];
  }>;
  fontSize?: number;
  fontWeight?: number;
  defaultColor?: string;
  highlightColor?: string;
  staggerDelay?: number;
  lineDelay?: number;
  direction?: AnimationDirection;
  startFrame?: number;
  textAlign?: "left" | "center" | "right";
}

export const KineticHeadline: React.FC<KineticHeadlineProps> = ({
  lines,
  fontSize = 88,
  fontWeight = 800,
  defaultColor = "#ffffff",
  highlightColor = brandColors.primary,
  staggerDelay = 4,
  lineDelay = 12,
  direction = "up",
  startFrame = 0,
  textAlign = "center",
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems:
          textAlign === "center"
            ? "center"
            : textAlign === "right"
              ? "flex-end"
              : "flex-start",
        gap: 8,
      }}
    >
      {lines.map((line, lineIndex) => (
        <KineticText
          key={lineIndex}
          text={line.text}
          fontSize={fontSize}
          fontWeight={fontWeight}
          color={line.color || defaultColor}
          highlightWords={line.highlightWords}
          highlightColor={highlightColor}
          staggerDelay={staggerDelay}
          direction={direction}
          startFrame={startFrame + lineIndex * lineDelay}
        />
      ))}
    </div>
  );
};
