import { useEffect, useRef } from "react";
import { useMotionValue, useTransform, animate } from "framer-motion";

export default function AnimatedNumber({ value, format }) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => (format ? format(v) : Math.round(v).toString()));
  const ref = useRef(null);

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [value]);

  useEffect(() => {
    return display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
  }, [display]);

  return <span ref={ref}>0</span>;
}
