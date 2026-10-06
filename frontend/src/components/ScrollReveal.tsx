"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  /** Extra classes on the observed wrapper (e.g. flex/grid sizing). */
  className?: string;
  /** Stagger entrance in ms; applied as transition-delay (harmless under reduced motion). */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      queueMicrotask(() => setVisible(true));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          queueMicrotask(() => setVisible(true));
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`fade-section${className ? ` ${className}` : ""}`}
      style={{
        ...(visible ? { opacity: 1, transform: "translateY(0)" } : undefined),
        ...(delay > 0 ? { transitionDelay: `${delay}ms` } : undefined),
      }}
    >
      {children}
    </div>
  );
}
