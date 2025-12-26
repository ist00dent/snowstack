import { useEffect, useRef } from "react";

export function useRafLoop(fn: (t: number) => void) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      fnRef.current(t);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}
