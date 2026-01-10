/**
 * ツールレジストリ
 *
 * MCPサーバーで提供するツールの登録と管理を行います。
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private handlers: Map<string, ToolHandler> = new Map();

  /**
   * ツールを登録します
   */
  registerTool(tool: Tool, handler: ToolHandler): void {
    this.tools.set(tool.name, tool);
    this.handlers.set(tool.name, handler);
  }

  /**
   * 登録されているツールの一覧を取得します
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * ツールを実行します
   */
  async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    return await handler(args);
  }

  /**
   * ツールが存在するかチェックします
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
}
