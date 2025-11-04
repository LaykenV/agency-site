"use client";

import { useEffect, useState } from "react";
import styles from "./star-rating.module.css";

type StarRatingProps = {
  align?: "left" | "center" | "right";
  className?: string;
};

const StarRating = ({ align = "center", className }: StarRatingProps) => {
  const [animatedStars, setAnimatedStars] = useState<number[]>([]);

  useEffect(() => {
    // Animate each star sequentially with 0.25s interval
    const timeouts: NodeJS.Timeout[] = [];
    
    for (let i = 1; i <= 5; i++) {
      const timeout = setTimeout(() => {
        setAnimatedStars((prev) => [...prev, i]);
      }, (i - 1) * 350);
      timeouts.push(timeout);
    }

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  return (
    <div
      className={`${styles.wrapper}${className ? ` ${className}` : ""}`}
      style={{
        justifyContent:
          align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
      }}
    >
      <div className={styles.rating}>
        <div className={animatedStars.includes(1) ? styles.animated : ""}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              pathLength={360}
              d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"
            />
          </svg>
        </div>
        <div className={animatedStars.includes(2) ? styles.animated : ""}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              pathLength={360}
              d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"
            />
          </svg>
        </div>
        <div className={animatedStars.includes(3) ? styles.animated : ""}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              pathLength={360}
              d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"
            />
          </svg>
        </div>
        <div className={animatedStars.includes(4) ? styles.animated : ""}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              pathLength={360}
              d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"
            />
          </svg>
        </div>
        <div className={animatedStars.includes(5) ? styles.animated : ""}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              pathLength={360}
              d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default StarRating;

