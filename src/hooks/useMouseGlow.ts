import { useEffect } from 'react';

/**
 * 全局鼠标光晕：把指针坐标写入 CSS 变量 --gx / --gy（px），
 * 供 AuroraBackground / 全局光标光线使用。
 */
export function useMouseGlow(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--gx', `${e.clientX}px`);
        document.documentElement.style.setProperty('--gy', `${e.clientY}px`);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);
}