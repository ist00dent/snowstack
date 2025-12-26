"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";

export type MatterConfig = {
  gravityY: number;
  restitution: number;
  friction: number;
  frictionAir: number;
  ttlMs: number;
  allowSideExit: boolean;

  maxBodies: number; // ✅ global cap
};

export type MatterAPI = {
  throwChunks: (x: number, y: number, vx: number, vy: number, count: number, rBase: number) => void;
  setConfig: (partial: Partial<MatterConfig>) => void;
};

const DEFAULT_CFG: MatterConfig = {
  gravityY: 1.0,
  restitution: 0.35,
  friction: 0.10,
  frictionAir: 0.02,
  ttlMs: 2500,
  allowSideExit: true,
  maxBodies: 200,
};

export function MatterSnowChunks({
  zIndex = 4,
  apiRef,
  initialConfig,
}: {
  zIndex?: number;
  apiRef: React.MutableRefObject<MatterAPI | null>;
  initialConfig?: Partial<MatterConfig>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const Engine = Matter.Engine;
    const World = Matter.World;
    const Bodies = Matter.Bodies;
    const Composite = Matter.Composite;

    const engine = Engine.create({ enableSleeping: true });

    const cfgRef = { current: { ...DEFAULT_CFG, ...(initialConfig ?? {}) } };

    // spawn time + order tracking
    const bornAt = new WeakMap<Matter.Body, number>();
    const order: Matter.Body[] = []; // oldest -> newest

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const buildBoundaries = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      Composite.clear(engine.world, false);

      const thick = 160;
      const ground = Bodies.rectangle(w / 2, h + thick / 2, w + 800, thick, { isStatic: true });
      World.add(engine.world, [ground]);

      if (!cfgRef.current.allowSideExit) {
        const wallT = 160;
        const left = Bodies.rectangle(-wallT / 2, h / 2, wallT, h + 800, { isStatic: true });
        const right = Bodies.rectangle(w + wallT / 2, h / 2, wallT, h + 800, { isStatic: true });
        World.add(engine.world, [left, right]);
      }
    };

    const syncSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      buildBoundaries();
    };

    const applyEngineCfg = () => {
      engine.gravity.y = cfgRef.current.gravityY;
    };

    const removeBody = (b: Matter.Body) => {
      World.remove(engine.world, b);

      // remove from order array if present
      const idx = order.indexOf(b);
      if (idx >= 0) order.splice(idx, 1);
    };

    const enforceCap = () => {
      const cfg = cfgRef.current;
      // count only dynamic bodies
      let dynCount = 0;
      for (const b of order) if (!b.isStatic) dynCount++;

      while (dynCount > cfg.maxBodies) {
        // remove oldest dynamic
        const oldest = order.find((b) => !b.isStatic);
        if (!oldest) break;
        removeBody(oldest);
        dynCount--;
      }
    };

    syncSize();
    applyEngineCfg();
    window.addEventListener("resize", syncSize);

    apiRef.current = {
      throwChunks: (x, y, vx, vy, count, rBase) => {
        const cfg = cfgRef.current;

        for (let i = 0; i < count; i++) {
          const r = rBase * (0.7 + Math.random() * 0.9);
          const b = Bodies.circle(x, y, r, {
            restitution: cfg.restitution,
            friction: cfg.friction,
            frictionAir: cfg.frictionAir,
          });

          Matter.Body.setVelocity(b, {
            x: vx * 0.9 + (Math.random() - 0.5) * 6,
            y: vy * 0.7 - (8 + Math.random() * 8),
          });

          bornAt.set(b, performance.now());
          order.push(b);
          World.add(engine.world, b);
        }

        enforceCap();
      },

      setConfig: (partial) => {
        const prevAllow = cfgRef.current.allowSideExit;
        cfgRef.current = { ...cfgRef.current, ...partial };
        applyEngineCfg();

        if (partial.allowSideExit !== undefined && partial.allowSideExit !== prevAllow) {
          buildBoundaries();
        }

        if (partial.maxBodies !== undefined) {
          enforceCap();
        }
      },
    };

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);

      Engine.update(engine, 1000 / 60);

      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.92)";

      const now = performance.now();
      const ttl = cfgRef.current.ttlMs;

      // iterate over a copy because we may remove
      for (const b of [...order]) {
        if (b.isStatic) continue;

        const born = bornAt.get(b) ?? now;
        const age = now - born;

        if (age > ttl) {
          removeBody(b);
          continue;
        }

        if (b.position.x < -500 || b.position.x > w + 500 || b.position.y > h + 800 || b.position.y < -800) {
          removeBody(b);
          continue;
        }

        const r = (b as any).circleRadius || 3;
        ctx.beginPath();
        ctx.arc(b.position.x, b.position.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // safety cap enforcement (in case TTL is long)
      enforceCap();
    };

    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", syncSize);
      apiRef.current = null;
    };
  }, [apiRef, initialConfig]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex, pointerEvents: "none" }}
    />
  );
}
