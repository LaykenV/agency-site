"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CalendarCheck2, FolderCog, Rocket } from "lucide-react";

const steps = [
  { k: 1, title: "Talk for 15 Minutes", desc: "Tell us your goals. We’ll map pages and style, fast.", Icon: CalendarCheck2 },
  { k: 2, title: "We Build Your Website", desc: "Hand‑coded, mobile‑first, and tuned for speed. You review before launch.", Icon: FolderCog },
  { k: 3, title: "Launch and Grow", desc: "We host it, manage the domain, and handle edit requests in the client portal anytime.", Icon: Rocket },
] as const;

export function HowItWorks() {
  const reduce = useReducedMotion();
  return (
    <div className="timeline">
      <ol>
        {steps.map((s, i) => (
          <li key={s.k} className="timeline-step">
            <motion.div
              initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20%" }}
              transition={reduce ? { duration: 0 } : { delay: i * 0.06, duration: 0.35 }}
            >
              <div className="step-index" aria-hidden>{s.k}</div>
              <div className="step-body">
                <div className="step-title">
                  <s.Icon className="h-4 w-4" /> {s.title}
                </div>
                <p className="step-desc">{s.desc}</p>
              </div>
            </motion.div>
            {i < steps.length - 1 && <div className="timeline-connector" aria-hidden />}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default HowItWorks;


