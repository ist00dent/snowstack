import { clamp } from "./physics";

export type Heightfield = {
  cols: number;
  colW: number;
  w: number;
  h: number;
  maxDepth: number;
  heights: Float32Array;
};

export function createHeightfield(cols: number, colW: number, w: number, h: number, maxDepth: number): Heightfield {
  return { cols, colW, w, h, maxDepth, heights: new Float32Array(cols) };
}

export function depositAtX(model: Heightfield, x: number, amount: number) {
  const i = clamp(Math.floor(x / model.colW), 0, model.cols - 1);
  add(model, i, amount * 0.6);
  add(model, i - 1, amount * 0.22);
  add(model, i + 1, amount * 0.22);
}

function add(model: Heightfield, idx: number, amt: number) {
  if (idx < 0 || idx >= model.cols) return;
  model.heights[idx] = clamp(model.heights[idx] + amt, 0, model.maxDepth);
}

export function smoothHeights(model: Heightfield, k: number) {
  const h = model.heights;
  const tmp = new Float32Array(h.length);

  for (let i = 0; i < h.length; i++) {
    const a = h[i - 1] ?? h[i];
    const b = h[i];
    const c = h[i + 1] ?? h[i];
    const avg = (a + b + c) / 3;
    tmp[i] = b + (avg - b) * k;
  }
  model.heights.set(tmp);
}

export function avgHeight(model: Heightfield) {
  const h = model.heights;
  let sum = 0;
  for (let i = 0; i < h.length; i++) sum += h[i];
  return sum / h.length;
}

export function driftGround(model: Heightfield, windX: number) {
  const h = model.heights;
  const tmp = new Float32Array(h.length);
  tmp.set(h);

  const k = Math.min(0.06, Math.abs(windX) * 0.02);
  if (k <= 0) return;

  if (windX > 0) {
    for (let i = h.length - 2; i >= 0; i--) {
      const move = tmp[i] * k;
      tmp[i] -= move;
      tmp[i + 1] += move;
    }
  } else {
    for (let i = 1; i < h.length; i++) {
      const move = tmp[i] * k;
      tmp[i] -= move;
      tmp[i - 1] += move;
    }
  }

  for (let i = 0; i < tmp.length; i++) tmp[i] = clamp(tmp[i], 0, model.maxDepth);
  model.heights.set(tmp);
}

export function removeSnowRect(model: Heightfield, x: number, y: number, w: number, h: number, maxRemove: number) {
  const leftCol = clamp(Math.floor(x / model.colW), 0, model.cols - 1);
  const rightCol = clamp(Math.floor((x + w) / model.colW), 0, model.cols - 1);

  let removed = 0;

  for (let i = leftCol; i <= rightCol; i++) {
    if (removed >= maxRemove) break;

    const surfaceY = model.h - model.heights[i];
    const rectBottom = y + h;

    if (rectBottom <= surfaceY) continue;

    const penetration = rectBottom - surfaceY;
    const take = clamp(penetration * 0.35, 0, model.heights[i]);

    const remaining = maxRemove - removed;
    const actual = Math.min(take, remaining);

    model.heights[i] = clamp(model.heights[i] - actual, 0, model.maxDepth);
    removed += actual;
  }

  return removed;
}
