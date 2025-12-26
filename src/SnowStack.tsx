"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SnowAccumulationCanvas, type AccumulationAPI } from "./engines/SnowAccumulationCanvas";
import { SnowfallEngine } from "./engines/SnowfallEngine";
import { SnowShovel } from "./ui/SnowShovel";
import { MatterSnowChunks, type MatterAPI } from "./engines/MatterSnowChunks";
import { useWindFromScroll } from "./hooks/useWindFromScroll";
import { clamp } from "./physics/physics";

export type SnowPresetName =
  | "calm"        // react-snowfall-ish
  | "cozy"
  | "storm"
  | "interactive"; // enables shovel sooner + chunk physics

export type SnowStackProps = {
  enabled?: boolean;
  preset?: SnowPresetName;

  // keep only SAFE knobs exposed
  intensity?: number;      // 0..1
  speed?: number;          // 0..1
  wind?: number;           // 0..1
  interactive?: boolean;   // shovel + chunks (optional)
};

type InternalPreset = {
  flakeCount: number;
  snowfallSpeed: number;
  snowflakeSize: [number, number];
  windStrength: number;

  pileMaxDepth: number;
  pileSmoothness: number;
  pileFPS: number;

  shovelScale: number;
  shovelRevealDepth: number;

  chunkTtlMs: number;
  chunkBounciness: number;
  chunkAirDrag: number;
  chunkAllowSideExit: boolean;
  chunkGravityY: number;
};

const PRESETS: Record<SnowPresetName, InternalPreset> = {
  calm: {
    flakeCount: 120,
    snowfallSpeed: 0.60,
    snowflakeSize: [0.8, 1.8],
    windStrength: 0.50,

    pileMaxDepth: 160,
    pileSmoothness: 0.078,
    pileFPS: 20,

    shovelScale: 1.0,
    shovelRevealDepth: 9999,

    chunkTtlMs: 3800,
    chunkBounciness: 0.25,
    chunkAirDrag: 0.03,
    chunkAllowSideExit: true,
    chunkGravityY: 0.9,
  },


  cozy: {
    flakeCount: 170,
    snowfallSpeed: 0.9,
    snowflakeSize: [0.9, 2.2],
    windStrength: 0.8,

    pileMaxDepth: 200,
    pileSmoothness: 0.06,
    pileFPS: 30,

    shovelScale: 1.0,
    shovelRevealDepth: 28,

    chunkTtlMs: 4500,
    chunkBounciness: 0.35,
    chunkAirDrag: 0.02,
    chunkAllowSideExit: true,
    chunkGravityY: 1.0,
  },

  storm: {
    flakeCount: 240,
    snowfallSpeed: 1.15,
    snowflakeSize: [1.0, 2.6],
    windStrength: 1.15,

    pileMaxDepth: 220,
    pileSmoothness: 0.058,
    pileFPS: 30,

    shovelScale: 1.0,
    shovelRevealDepth: 22,

    chunkTtlMs: 5000,
    chunkBounciness: 0.35,
    chunkAirDrag: 0.02,
    chunkAllowSideExit: true,
    chunkGravityY: 1.05,
  },


  interactive: {
    flakeCount: 220,
    snowfallSpeed: 1.0,
    snowflakeSize: [0.9, 2.3],
    windStrength: 1.0,

    pileMaxDepth: 220,
    pileSmoothness: 0.06,
    pileFPS: 30,

    shovelScale: 1.0,
    shovelRevealDepth: 18,

    chunkTtlMs: 4500,
    chunkBounciness: 0.35,
    chunkAirDrag: 0.02,
    chunkAllowSideExit: true,
    chunkGravityY: 1.0,
  },
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clampNum = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function applySafety(p: InternalPreset): InternalPreset {
  return {
    ...p,
    flakeCount: clampNum(p.flakeCount, 60, 260),
    snowfallSpeed: clampNum(p.snowfallSpeed, 0.45, 1.2),
    snowflakeSize: [clampNum(p.snowflakeSize[0], 0.6, 1.6), clampNum(p.snowflakeSize[1], 1.2, 3.2)],
    windStrength: clampNum(p.windStrength, 0, 1.2),

    pileMaxDepth: clampNum(p.pileMaxDepth, 80, 220),
    pileSmoothness: clampNum(p.pileSmoothness, 0.055, 0.085),
    pileFPS: clampNum(p.pileFPS, 15, 30), // cap to protect CPU

    shovelScale: clampNum(p.shovelScale, 0.85, 1.2),
    shovelRevealDepth: clampNum(p.shovelRevealDepth, 12, 9999),

    chunkTtlMs: clampNum(p.chunkTtlMs, 2000, 7000),
    chunkBounciness: clampNum(p.chunkBounciness, 0.15, 0.55),
    chunkAirDrag: clampNum(p.chunkAirDrag, 0.01, 0.06),
    chunkAllowSideExit: p.chunkAllowSideExit,
    chunkGravityY: clampNum(p.chunkGravityY, 0.7, 1.2),
  };
}

function morphPreset(base: InternalPreset, intensity = 0, speed = 0, wind = 0): InternalPreset {
  const i = clamp01(intensity);
  const s = clamp01(speed);
  const w = clamp01(wind);

  return applySafety({
    ...base,
    flakeCount: Math.round(base.flakeCount * (0.85 + 0.35 * i)), 
    snowfallSpeed: base.snowfallSpeed * (0.9 + 0.25 * s),
    windStrength: base.windStrength * (0.9 + 0.25 * w),
  });
}


export function SnowStack(props: SnowStackProps) {
  const {
    enabled = true,
    preset = "calm",
    intensity = 0,     // default calm
    speed = 0,
    wind = 0,
    interactive = false,
  } = props;

  const base = PRESETS[interactive ? "interactive" : preset];
  const cfg = useMemo(() => morphPreset(base, intensity, speed, wind), [base, intensity, speed, wind]);

  const apiRef = useRef<AccumulationAPI | null>(null);
  const matterRef = useRef<MatterAPI | null>(null);

  const windFromScroll = useWindFromScroll(); // -2..2
  const windX = useMemo(() => clamp(windFromScroll * cfg.windStrength, -2, 2), [windFromScroll, cfg.windStrength]);

  const [avgDepth, setAvgDepth] = useState(0);
  const shovelVisible = enabled && interactive && avgDepth >= cfg.shovelRevealDepth;

  const matterInit = useMemo(
    () => ({
      ttlMs: cfg.chunkTtlMs,
      restitution: cfg.chunkBounciness,
      frictionAir: cfg.chunkAirDrag,
      allowSideExit: cfg.chunkAllowSideExit,
      gravityY: cfg.chunkGravityY,
    }),
    [cfg.chunkTtlMs, cfg.chunkBounciness, cfg.chunkAirDrag, cfg.chunkAllowSideExit, cfg.chunkGravityY]
  );

  useEffect(() => {
    matterRef.current?.setConfig(matterInit);
  }, [matterInit]);

  return (
    <>
      <SnowfallEngine
        zIndex={1}
        enabled={enabled}
        getAPI={() => apiRef.current}
        windX={windX}
        flakeCount={cfg.flakeCount}
        snowfallSpeed={cfg.snowfallSpeed}
        snowflakeSize={cfg.snowflakeSize}
      />

      <SnowAccumulationCanvas
        zIndex={2}
        enabled={enabled}
        windX={windX}
        apiRef={apiRef}
        onAvgDepth={setAvgDepth}
        pileMaxDepth={cfg.pileMaxDepth}
        pileSmoothness={cfg.pileSmoothness}
        pileFPS={cfg.pileFPS}
      />

      {enabled && interactive && (
        <MatterSnowChunks zIndex={4} apiRef={matterRef} initialConfig={matterInit} />
      )}

      <SnowShovel
        zIndex={3}
        visible={shovelVisible}
        scale={cfg.shovelScale}
        getAPI={() => apiRef.current}
        getMatter={() => matterRef.current}
      />
    </>
  );
}

