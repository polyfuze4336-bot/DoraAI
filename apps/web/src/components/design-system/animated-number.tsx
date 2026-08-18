"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

interface AnimatedNumberProps {
  readonly value: number;
  readonly format?: (value: number) => string;
  readonly className?: string;
}

export function AnimatedNumber({
  value,
  format = (current) => Math.round(current).toLocaleString("en-US"),
  className,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(value);
  const springValue = useSpring(motionValue, {
    damping: 32,
    mass: 0.55,
    stiffness: 130,
  });
  const displayValue = useTransform(springValue, (current) => format(current));

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  return <motion.span className={className}>{displayValue}</motion.span>;
}
