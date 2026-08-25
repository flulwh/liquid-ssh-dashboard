import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  /** 可选格式化函数，例如 formatBytes / formatPercent */
  format?: (v: number) => string;
  duration?: number;
}

/**
 * 数字滚动动画组件：数值变化时以弹性曲线平滑过渡。
 * 类似 Apple 发布会 Keynote 中的数字滚动强调。
 */
export function AnimatedNumber({
  value,
  className,
  format,
  duration = 0.9,
}: AnimatedNumberProps) {
  const mv = useMotionValue(value);

  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [value, duration, mv]);

  const text = useTransform(mv, (v) =>
    format ? format(v) : String(Math.round(v))
  );

  return <motion.span className={className}>{text}</motion.span>;
}