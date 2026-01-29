"use client";

import { m as motion, useInView, useMotionValue, animate, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function PerformanceGauge({ value = 95 }: { value: number }) {
  const r = 74;
  const C = 2 * Math.PI * r;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const mv = useMotionValue(0);
  const offset = useTransform(mv, (v) => C - (C * v) / 100);
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const ring = animate(mv, value, { duration: 1.2, ease: "easeOut" });
    const num = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => {
      ring.stop();
      num.stop();
    };
  }, [inView, value, mv]);

  // offset handled via strokeDashoffset MotionValue above

  return (
    <div ref={ref} className="gauge">
      <svg className="gauge-svg" viewBox="0 0 160 160">
        <circle className="gauge-track" cx="80" cy="80" r={r} />
        <motion.circle
          className="gauge-progress"
          cx="80"
          cy="80"
          r={r}
          strokeDasharray={C}
          style={{ strokeDashoffset: offset } as unknown as React.CSSProperties}
        />
      </svg>
      <div className="gauge-label">
        <div className="gauge-value">{n}%</div>
        <div className="gauge-subtitle">Performance</div>
      </div>
    </div>
  );
}

export default PerformanceGauge;


