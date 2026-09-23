import { useEffect, useRef, useState } from 'react';

function useAnimatedNumber(target, duration = 700) {
  const [value, setValue] = useState(target);
  const prevTarget = useRef(target);
  const rafRef = useRef();

  useEffect(() => {
    const start = prevTarget.current;
    const startTime = performance.now();
    cancelAnimationFrame(rafRef.current);

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + (target - start) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      else prevTarget.current = target;
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// value: a number. format: fn(number) => string, e.g. fmtINR
export default function AnimatedNumber({ value, format = (v) => Math.round(v).toLocaleString('en-IN') }) {
  const animated = useAnimatedNumber(value);
  return <>{format(animated)}</>;
}