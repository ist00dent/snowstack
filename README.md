# ❄️ SnowStack

**SnowStack** is a lightweight, interactive snow effect for React/Next.js that combines:

- Smooth snowfall (React-Snowfall–style calm mode)
- Snow accumulation at the bottom of the screen
- Optional **interactive shovel** (scoop + throw with physics)
- Mobile-safe interaction (no scroll hijacking)
- Performance-bounded presets to protect production sites

Built with **Canvas + Matter.js**, designed to be fun without being destructive.

---

### 🔗 Live Demo
https://snowstack-live-demo.vercel.app/

---

## ✨ Features

- 🌨 **Snowfall Engine** — density, speed, size, wind
- ❄️ **Accumulation** — piles up naturally at the bottom
- 🥄 **Interactive Shovel (optional)** — scoop and throw chunks with physics
- 📱 **Mobile-safe controls** — shovel ON/OFF toggle + pointer capture
- 🧊 **Presets-first** — safe defaults, bounded ranges
- ⚡ **Performance guarded** — capped FPS and chunk limits

---

## 📦 Install

```bash
npm install snowstack
# or
pnpm add snowstack
# or
yarn add snowstack
````

---

## 🚀 Quick Start

> ⚠️ SnowStack is a client-side effect and must be used inside `"use client"` components.


```tsx
import { SnowStack } from "snowstack";

export default function Page() {
  return <SnowStack />;
}
```

Default behavior is **calm, non-interactive snowfall**.

---

## 🎛 Presets

Available presets:

* `calm` (default) — subtle snowfall
* `cozy` — a bit denser
* `storm` — heavy snow + stronger wind (still clamped for safety)
* `interactive` — enables shovel + physics chunks

```tsx
<SnowStack preset="cozy" />
```

---

## 🥄 Interactive Mode (Shovel)

```tsx
<SnowStack preset="interactive" interactive />
```

### Desktop

* Hold **Shift**
* Drag near the snow pile to scoop
* Release to throw

### Mobile

* Tap **Shovel: ON**
* Drag to scoop
* Release to throw
* Tap **Shovel: OFF** to disable

---

## Safe Customization (Limited by Design)

SnowStack exposes only safe knobs:

```tsx
<SnowStack
  preset="calm"
  intensity={0.4}  // 0..1 (density)
  speed={0.3}      // 0..1 (fall speed)
  wind={0.2}       // 0..1 (wind influence)
  interactive={false}
/>
```

All internal values are **clamped** to prevent runaway CPU usage.

---

## 📷 Demo

![SnowStack Demo](./assets/demo.gif)

- This demo used a preset "storm" 
---

## 🧠 Tech

* React / Next.js (`"use client"`)
* Canvas rendering
* Matter.js (snow chunks only)
* requestAnimationFrame loops
* Minimal DOM (mostly canvas)

---

## ⚡ Performance Notes

SnowStack automatically:

* caps snowflake counts
* limits physics bodies
* removes off-screen chunks
* keeps FPS bounded

---

## 🤝 Contributing & Forking

SnowStack is intentionally designed to be **safe by default**.

You are welcome to:

- Fork the project
- Modify visuals (SVGs, colors, shovel appearance)
- Create new presets
- Optimize or extend physics behavior

### Design Philosophy

To keep SnowStack production-friendly:

- Public props are **intentionally limited**
- All internal values are **clamped**
- Presets are preferred over raw configuration
- Heavy physics runs **only when interactive mode is enabled**

If you add new controls, please:
- keep reasonable bounds
- avoid unbounded loops or unguarded physics
- respect mobile performance constraints

Pull requests are welcome if they align with these goals.

---



## 📜 License
MIT
