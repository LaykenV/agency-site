"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CalendarCheck2, FolderCog, Rocket } from "lucide-react";

const steps = [
  { k: 1, title: "Quick Call, Real Plan", desc: "Tell us about your business. We'll show you exactly what your site will look like.", Icon: CalendarCheck2 },
  { k: 2, title: "We Build It, You Approve It", desc: "Custom site designed around your business. Loads fast on any phone. You see it before it goes live.", Icon: FolderCog },
  { k: 3, title: "Launch and Forget the Tech", desc: "We handle hosting, security, and your domain. Need changes? Submit a request through your portal.", Icon: Rocket },
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
