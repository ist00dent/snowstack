"use client";

import React from "react";
import { Shovel } from "lucide-react";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function ShovelWithSnow({
  loadRatio,
  size = 46,
  strokeWidth = 2.2,
}: {
  loadRatio: number;
  size?: number;
  strokeWidth?: number;
}) {
  const r = clamp01(loadRatio);

  // Bigger + clearer snow as load increases
  const snowOpacity = 0.25 + 0.75 * r;
  const snowScale = 0.65 + 0.75 * r;

  // Position where the blade visually sits in lucide Shovel (lower-right)
  const snowX = 10.5;
  const snowY = 13.2;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <Shovel size={size} strokeWidth={strokeWidth} />

      {r > 0.03 && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 1,
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.22))",
          }}
        >
          <g transform={`translate(${snowX}, ${snowY}) scale(${snowScale})`}>
            {/* mound */}
            <path
              d="M0.4 5.8
                 C1.6 3.2 5.6 2.8 7.6 4.1
                 C9.9 5.5 10.1 8.1 8.3 9.6
                 C6.2 11.4 3.0 11.0 1.3 9.7
                 C-0.4 8.4 -0.3 7.1 0.4 5.8 Z"
              fill={`rgba(245,248,255,${snowOpacity})`}
            />
            {/* highlight */}
            <path
              d="M1.6 5.8 C2.8 4.6 5.2 4.3 6.8 5.1"
              stroke={`rgba(255,255,255,${0.35 + 0.5 * r})`}
              strokeWidth="0.7"
              strokeLinecap="round"
              fill="none"
            />
            {/* specks */}
            {r > 0.2 && (
              <>
                <circle cx="7.5" cy="8.2" r={0.35 + 0.25 * r} fill="rgba(255,255,255,0.95)" />
                <circle cx="5.8" cy="7.1" r={0.28 + 0.18 * r} fill="rgba(255,255,255,0.9)" />
                <circle cx="6.4" cy="6.3" r={0.22 + 0.14 * r} fill="rgba(255,255,255,0.85)" />
              </>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}
