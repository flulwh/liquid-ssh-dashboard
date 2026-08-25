import { type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../utils/cn';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
  /** 保留接口以兼容旧用法；MD3 下无光斑效果 */
  spotlight?: boolean;
  /** 悬浮表面层次变化 */
  hover?: boolean;
  /** 更强的表面层级 */
  strong?: boolean;
}

/**
 * MD3 表面卡片：
 * surface-container 表面 + 可选悬停抬升，无玻璃模糊/光斑/渐变。
 */
export function GlassCard({
  children,
  hover = false,
  strong = false,
  className,
  style,
  ...rest
}: GlassCardProps) {
  return (
    <motion.div
      className={cn('glass', strong && 'glass-strong', hover && 'glass-hover', className)}
      style={style}
      {...rest}
    >
      {children}
    </motion.div>
  );
}