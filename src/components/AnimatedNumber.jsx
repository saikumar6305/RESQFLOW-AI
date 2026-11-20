import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

export default function AnimatedNumber({ value, duration = 0.9 }) {
  const [n, setN] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const c = animate(prev.current, Number(value) || 0, { duration, ease: "easeOut", onUpdate: (v) => setN(Math.round(v)) });
    prev.current = Number(value) || 0;
    return () => c.stop();
  }, [value, duration]);
  return <>{n}</>;
}
