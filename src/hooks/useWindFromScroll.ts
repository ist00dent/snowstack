"use client";

import { useEffect, useState } from "react";

export function useWindFromScroll() {
  const [windX, setWindX] = useState(0);

  useEffect(() => {
    let lastY = window.scrollY;
    let lastT = performance.now();

    const onScroll = () => {
      const y = window.scrollY;
      const t = performance.now();
      const dt = Math.max(16, t - lastT);

      const v = (y - lastY) / dt; // px/ms
      const w = Math.max(-2, Math.min(2, v * 20)); // map to -2..2

      setWindX(w);
      lastY = y;
      lastT = t;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return windX;
}
