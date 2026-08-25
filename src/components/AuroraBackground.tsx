import { memo } from 'react';

/**
 * 应用背景：MD3 纯 surface 色。原 Aurora 动态光斑/网格/噪点已收敛为单一表面。
 */
export const AuroraBackground = memo(function AuroraBackground() {
  return <div className="aurora-field" aria-hidden />;
});