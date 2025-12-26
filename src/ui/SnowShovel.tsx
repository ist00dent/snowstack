"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AccumulationAPI } from "../engines/SnowAccumulationCanvas";
import type { MatterAPI } from "../engines/MatterSnowChunks";
import { clamp } from "../physics/physics";
import { ShovelWithSnow } from "./ShovelWithSnow";

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function SnowShovel({
  zIndex = 3,
  visible,
  scale,
  getAPI,
  getMatter,
}: {
  zIndex?: number;
  visible: boolean;
  scale: number;
  getAPI: () => AccumulationAPI | null;
  getMatter: () => MatterAPI | null;
}) {
  const touch = useMemo(() => isTouchDevice(), []);
  const [armed, setArmed] = useState(false);
  const [pos, setPos] = useState({ x: 120, y: 120 });

  const [loadUI, setLoadUI] = useState(0);
  const loadRef = useRef(0);
  const draggingRef = useRef(false);
  const lastRef = useRef({ x: 0, y: 0, t: 0 });
  const lastCommitRef = useRef(0);

  const shovel = useMemo(() => {
    const headW = 92 * scale;
    const headH = 44 * scale;
    const capacity = 140 * scale;
    return { headW, headH, capacity };
  }, [scale]);

  // Desktop: Shift to arm
  useEffect(() => {
    if (touch) return;
    const kd = (e: KeyboardEvent) => e.key === "Shift" && setArmed(true);
    const ku = (e: KeyboardEvent) => e.key === "Shift" && setArmed(false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [touch]);

  // Scoop loop (runs while dragging)
  useEffect(() => {
    let raf = 0;

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);

      if (!visible || !armed || !draggingRef.current) return;

      const api = getAPI();
      if (!api) return;

      const load = loadRef.current;
      const remaining = shovel.capacity - load;
      if (remaining <= 0) return;

      // blade offset (cursor + a bit)
      const bladeX = pos.x + 22 * scale;
      const bladeY = pos.y + 16 * scale;

      const rectX = bladeX - shovel.headW / 2;
      const rectY = bladeY - shovel.headH / 2;

      const taken = api.removeRect(rectX, rectY, shovel.headW, shovel.headH, remaining);
      if (taken > 0) {
        loadRef.current = clamp(load + taken, 0, shovel.capacity);

        if (t - lastCommitRef.current > 50) {
          lastCommitRef.current = t;
          setLoadUI(loadRef.current);
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [armed, visible, pos.x, pos.y, scale, shovel.capacity, shovel.headW, shovel.headH, getAPI]);

  function throwSnow(x: number, y: number) {
    const matter = getMatter();
    if (!matter) return;

    const now = performance.now();
    const last = lastRef.current;
    const dt = Math.max(16, now - last.t);

    const dx = x - last.x;
    const dy = y - last.y;

    let vx = dx / (dt / 16.67);
    let vy = dy / (dt / 16.67);

    // allow sideways throws
    vx = clamp(vx, -70, 70);
    vy = clamp(vy, -70, 70);

    lastRef.current = { x, y, t: now };

    const amt = loadRef.current;
    loadRef.current = 0;
    setLoadUI(0);

    const count = Math.floor(clamp(amt / (7 * scale), 10, 44));
    const rBase = 2.4 * scale;

    matter.throwChunks(x, y, vx, vy, count, rBase);
  }

  if (!visible) return null;

  const loadRatio = loadUI / shovel.capacity;

  return (
    <>
      {/* ✅ MOBILE: Floating enable/disable button */}
      {touch && (
        <button
          onClick={() => setArmed((v) => !v)}
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            zIndex: zIndex + 50,
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.22)",
            background: armed ? "rgba(255,255,255,0.92)" : "rgba(15, 23, 42, 0.60)",
            color: armed ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.92)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {armed ? "Shovel: ON" : "Shovel: OFF"}
        </button>
      )}

      {/* ✅ MOBILE: Touch capture overlay (only when armed) */}
      {touch && armed && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: zIndex + 40,
            background: "transparent",
            touchAction: "none",   // ✅ stop scroll/zoom stealing drag
            pointerEvents: "auto",
          }}
          onPointerDown={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.setPointerCapture(e.pointerId);

            draggingRef.current = true;
            setPos({ x: e.clientX, y: e.clientY });
            lastRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
          }}
          onPointerMove={(e) => {
            setPos({ x: e.clientX, y: e.clientY });
          }}
          onPointerUp={(e) => {
            if (loadRef.current > 1) throwSnow(e.clientX, e.clientY);
            draggingRef.current = false;
          }}
          onPointerCancel={() => {
            draggingRef.current = false;
          }}
        />
      )}

      {/* DESKTOP: pointer tracking (for cursor follow) */}
      {!touch && (
        <DesktopPointerTracker
          onMove={(x, y) => setPos({ x, y })}
          onDown={(x, y) => {
            if (!armed) return;
            draggingRef.current = true;
            lastRef.current = { x, y, t: performance.now() };
          }}
          onUp={(x, y) => {
            if (armed && loadRef.current > 1) throwSnow(x, y);
            draggingRef.current = false;
          }}
        />
      )}

      {/* Shovel cursor */}
      <div
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex,
          pointerEvents: "none",
          transform: `translate(-30%, -30%) rotate(${armed ? -18 : -35}deg) scale(${scale})`,
          opacity: armed ? 1 : 0.92,
          transition: "opacity 200ms ease, transform 200ms ease",
          userSelect: "none",
          filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.25))",
        }}
      >
        <ShovelWithSnow loadRatio={loadRatio} size={46} />
        <div
          style={{
            marginTop: 6,
            width: 120,
            height: 8,
            borderRadius: 999,
            background: "rgba(255,255,255,0.25)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${loadRatio * 100}%`,
              height: "100%",
              background: "rgba(255,255,255,0.92)",
            }}
          />
        </div>
      </div>
    </>
  );
}

function DesktopPointerTracker({
  onMove,
  onDown,
  onUp,
}: {
  onMove: (x: number, y: number) => void;
  onDown: (x: number, y: number) => void;
  onUp: (x: number, y: number) => void;
}) {
  useEffect(() => {
    const move = (e: PointerEvent) => onMove(e.clientX, e.clientY);
    const down = (e: PointerEvent) => onDown(e.clientX, e.clientY);
    const up = (e: PointerEvent) => onUp(e.clientX, e.clientY);

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [onMove, onDown, onUp]);

  return null;
}
