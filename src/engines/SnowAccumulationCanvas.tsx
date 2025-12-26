"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRafLoop } from "../hooks/useRafLoop";
import {
  avgHeight,
  createHeightfield,
  depositAtX,
  driftGround,
  removeSnowRect,
  smoothHeights,
  type Heightfield,
} from "../physics/snowHeightfield";

export type AccumulationAPI = {
  getHeights: () => Float32Array;
  getMeta: () => { cols: number; colW: number; w: number; h: number };
  removeRect: (x: number, y: number, w: number, h: number, maxRemove: number) => number;
  depositAtX: (x: number, amount: number) => void;
};

export function SnowAccumulationCanvas({
  zIndex = 2,
  enabled,
  windX,
  apiRef,
  onAvgDepth,

  // package controls
  pileMaxDepth = 220,
  pileSmoothness = 0.06,
  pileFPS = 30,
  colW = 6,
}: {
  zIndex?: number;
  enabled: boolean;
  windX: number; // -2..2
  apiRef: React.MutableRefObject<AccumulationAPI | null>;
  onAvgDepth?: (v: number) => void;

  pileMaxDepth?: number;
  pileSmoothness?: number; // 0.01..0.15
  pileFPS?: number; // 15..60
  colW?: number; // 4..10
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelRef = useRef<Heightfield | null>(null);

  // cached draw state (avoid recompute inside draw)
  const drawRef = useRef({
    dpr: 1,
    w: 0,
    h: 0,
  });

  const settings = useMemo(
    () => ({
      colW,
      maxDepth: pileMaxDepth,
      smoothK: pileSmoothness,
      fps: pileFPS,
    }),
    [colW, pileMaxDepth, pileSmoothness, pileFPS]
  );

  useEffect(() => {
    const canvas = canvasRef.current!;
    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      drawRef.current = { dpr, w, h };

      const cols = Math.ceil(w / settings.colW);
      modelRef.current = createHeightfield(cols, settings.colW, w, h, settings.maxDepth);

      apiRef.current = {
        getHeights: () => modelRef.current!.heights,
        getMeta: () => ({
          cols: modelRef.current!.cols,
          colW: modelRef.current!.colW,
          w: modelRef.current!.w,
          h: modelRef.current!.h,
        }),
        removeRect: (x, y, rw, rh, maxRemove) =>
          removeSnowRect(modelRef.current!, x, y, rw, rh, maxRemove),
        depositAtX: (x, amount) => {
          const m = modelRef.current;
          if (!m) return;
          depositAtX(m, x, amount);
        },
      };
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [apiRef, settings]);

  const lastFrameRef = useRef(0);

  useRafLoop((t) => {
    if (!enabled) return;

    const model = modelRef.current;
    const canvas = canvasRef.current;
    if (!model || !canvas) return;

    const targetMs = 1000 / settings.fps;
    if (t - lastFrameRef.current < targetMs) return;
    lastFrameRef.current = t;

    // physics on pile
    driftGround(model, windX);
    smoothHeights(model, settings.smoothK);

    onAvgDepth?.(avgHeight(model));
    drawSnow(canvas, model, drawRef.current.dpr);
  });

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex, pointerEvents: "none" }}
    />
  );
}

function drawSnow(canvas: HTMLCanvasElement, model: Heightfield, dpr: number) {
  const ctx = canvas.getContext("2d")!;
  const w = model.w;
  const h = model.h;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const heights = model.heights;
  const colW = model.colW;

  ctx.beginPath();
  ctx.moveTo(0, h);

  // heightfield polyline
  for (let i = 0; i < heights.length; i++) {
    const x = i * colW;
    const y = h - heights[i];
    ctx.lineTo(x, y);
  }

  ctx.lineTo(w, h);
  ctx.closePath();

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 1;
  ctx.stroke();
}
