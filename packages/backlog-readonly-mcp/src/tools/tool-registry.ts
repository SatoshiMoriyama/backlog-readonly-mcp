/**
 * ツールレジストリ
 *
 * MCPサーバーで提供するツールの登録と管理を行います。
 */

import type { BacklogApiClient } from '../client/backlog-api-client.js';
import type { ToolDefinition, ToolResult } from '../types/index.js';

export type ToolHandler = (
  args: Record<string, unknown>,
  client: BacklogApiClient,
) => Promise<ToolResult>;

export class ToolRegistry {
  private tools: Map<
    string,
    { definition: ToolDefinition; handler: ToolHandler }
  > = new Map();

  /**
   * ツールを登録
   */
  public registerTool(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, { definition, handler });
  }

  /**
   * 登録されているツール一覧を取得
   */
  public getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.definition);
  }

  /**
   * ツールを実行
   */
  public async executeTool(
    name: string,
    args: Record<string, unknown>,
    client: BacklogApiClient,
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      return await tool.handler(args, client);
    } catch (error) {
      // エラーをMCP形式で返す
      return {
        content: [
          {
            type: 'text',
            text: `エラー: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  /**
   * ツールが存在するかチェック
   */
  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 登録されているツール数を取得
   */
  public getToolCount(): number {
    return this.tools.size;
  }
}
