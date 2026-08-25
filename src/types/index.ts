// ============================================================
// 全局类型定义
// ============================================================

/**
 * 服务器：仅包含来自真实 SSH 后端（/api/servers）的字段。
 * 前端不再持有任何示例/演示数据。
 */
export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
}

/** 终端标签（仅真实 SSH 会话） */
export interface TerminalTab {
  id: string;
  serverId: string;
  title: string;
}

export interface AIMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  kind?: 'text' | 'command' | 'alert' | 'suggestion';
  timestamp: number;
}