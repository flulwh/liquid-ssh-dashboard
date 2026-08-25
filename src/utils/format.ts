// ============================================================
// 数值格式化工具
// ============================================================

/** 字节数转人类可读 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** 网络速率：KB/s 自动换算 */
export function formatRate(kbps: number): string {
  if (kbps < 1024) return `${kbps.toFixed(1)} KB/s`;
  if (kbps < 1024 * 1024) return `${(kbps / 1024).toFixed(2)} MB/s`;
  return `${(kbps / (1024 * 1024)).toFixed(2)} GB/s`;
}

/** 百分比 */
export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

/** 数字千分位 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/** 相对时间 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

/** 当前时间字符串 HH:mm:ss */
export function clockTime(d = new Date()): string {
  return d.toLocaleTimeString('zh-CN', { hour12: false });
}