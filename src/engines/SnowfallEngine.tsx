"use client";

import { useEffect, useRef } from "react";
import type { AccumulationAPI } from "./SnowAccumulationCanvas";

type Flake = { x: number; y: number; vx: number; vy: number; r: number };

export function SnowfallEngine({
  zIndex = 1,
  enabled,
  getAPI,
  windX,
  flakeCount = 220,
  snowfallSpeed = 1.0,
  snowflakeSize = [0.9, 2.2],
}: {
  zIndex?: number;
  enabled: boolean;
  getAPI: () => AccumulationAPI | null;
  windX: number; // -2..2
  flakeCount?: number;
  snowfallSpeed?: number; // multiplier
  snowflakeSize?: [number, number];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flakesRef = useRef<Flake[]>([]);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const init = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const [rMin, rMax] = snowflakeSize;

      flakesRef.current = Array.from({ length: flakeCount }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (0.35 + Math.random() * 0.9) * snowfallSpeed,
        r: rMin + Math.random() * (rMax - rMin),
      }));
    };

    init();
    window.addEventListener("resize", init);
    return () => window.removeEventListener("resize", init);
  }, [enabled, flakeCount, snowfallSpeed, snowflakeSize]);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);

      const canvas = canvasRef.current;
      const api = getAPI();
      if (!canvas || !api) return;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const dt = Math.min(40, Math.max(10, t - (lastRef.current || t)));
      lastRef.current = t;

      const flakes = flakesRef.current;
      const meta = api.getMeta();
      const heights = api.getHeights();

      ctx.fillStyle = "rgba(255,255,255,0.92)";

      for (const f of flakes) {
        f.vx += windX * 0.0026;
        f.vx *= 0.995;

        // gravity scaled by snowfallSpeed too
        f.vy += 0.0011 * (dt / 16.67) * snowfallSpeed;

        f.x += f.vx * dt;
        f.y += f.vy * dt;

        if (f.x < -10) f.x = w + 10;
        if (f.x > w + 10) f.x = -10;

        const col = Math.max(0, Math.min(meta.cols - 1, Math.floor(f.x / meta.colW)));
        const surfaceY = meta.h - heights[col];

        if (f.y >= surfaceY) {
          api.depositAtX(f.x, 0.55 + f.r * 0.28);

          const [rMin, rMax] = snowflakeSize;
          f.x = Math.random() * w;
          f.y = -10 - Math.random() * 140;
          f.vx = (Math.random() - 0.5) * 0.25;
          f.vy = (0.35 + Math.random() * 0.95) * snowfallSpeed;
          f.r = rMin + Math.random() * (rMax - rMin);
        }

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled, getAPI, windX, snowfallSpeed, snowflakeSize]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex, pointerEvents: "none" }}
    />
  );
}
