/**
 * ツールレジストリ
 *
 * MCPサーバーで提供するツールの登録と管理を行います。
 * 要件6.1-6.4: 読み取り専用制限の実装
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ReadOnlyViolationError } from '../types/index.js';
import * as logger from '../utils/logger.js';

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

// 読み取り専用制限に違反するツール名のパターン
const WRITE_OPERATION_PATTERNS = [
  /^create/i,
  /^add/i,
  /^update/i,
  /^edit/i,
  /^modify/i,
  /^delete/i,
  /^remove/i,
  /^post/i,
  /^put/i,
  /^patch/i,
  /^upload/i,
  /^insert/i,
  /^save/i,
  /^write/i,
];

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private handlers: Map<string, ToolHandler> = new Map();

  /**
   * ツールを登録します
   * 要件6.4: ツール説明への読み取り専用明記
   */
  registerTool(tool: Tool, handler: ToolHandler): void {
    // 読み取り専用制限のチェック
    this.validateReadOnlyTool(tool);

    // ツール説明に読み取り専用であることを明記（まだ記載されていない場合）
    const enhancedTool = this.enhanceToolDescription(tool);

    this.tools.set(enhancedTool.name, enhancedTool);
    this.handlers.set(
      enhancedTool.name,
      this.wrapHandlerWithReadOnlyCheck(handler, enhancedTool.name),
    );

    logger.info(`ツールを登録しました: ${enhancedTool.name}`, {
      description: enhancedTool.description,
    });
  }

  /**
   * 登録されているツールの一覧を取得します
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * ツールを実行します
   * 要件6.3: データ変更を要求するツール呼び出しがあったとき、エラーメッセージを返す
   */
  async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const handler = this.handlers.get(name);
    if (!handler) {
      logger.error(`存在しないツールが呼び出されました: ${name}`);
      throw new Error(`存在しないツール: ${name}`);
    }

    logger.debug(`ツール実行開始: ${name}`, { args });

    try {
      const result = await handler(args);
      logger.debug(`ツール実行成功: ${name}`);
      return result;
    } catch (error) {
      logger.logError(`ツール実行エラー: ${name}`, error, { args });
      throw error;
    }
  }

  /**
   * ツールが存在するかチェックします
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 読み取り専用ツールかどうかを検証
   * 要件6.1-6.3: 読み取り専用制限の実装
   */
  private validateReadOnlyTool(tool: Tool): void {
    // ツール名が書き込み操作を示すパターンに一致するかチェック
    const isWriteOperation = WRITE_OPERATION_PATTERNS.some((pattern) =>
      pattern.test(tool.name),
    );

    if (isWriteOperation) {
      const errorMessage = `読み取り専用制限違反: ツール "${tool.name}" は書き込み操作を示すため登録できません。このMCPサーバーは読み取り専用です。`;
      logger.error(errorMessage);
      throw new ReadOnlyViolationError(errorMessage);
    }

    // ツール説明に書き込み操作を示すキーワードが含まれているかチェック
    const writeKeywords = [
      '作成',
      '追加',
      '更新',
      '編集',
      '変更',
      '削除',
      'create',
      'add',
      'update',
      'edit',
      'modify',
      'delete',
      'remove',
      'post',
      'put',
      'patch',
    ];
    const description = tool.description || '';
    const hasWriteKeyword = writeKeywords.some((keyword) =>
      description.toLowerCase().includes(keyword.toLowerCase()),
    );

    if (hasWriteKeyword && !description.includes('読み取り専用')) {
      const errorMessage = `読み取り専用制限違反: ツール "${tool.name}" の説明に書き込み操作を示すキーワードが含まれていますが、読み取り専用の明記がありません。`;
      logger.error(errorMessage);
      throw new ReadOnlyViolationError(errorMessage);
    }
  }

  /**
   * ツール説明を強化して読み取り専用であることを明記
   * 要件6.4: ツール説明への読み取り専用明記
   */
  private enhanceToolDescription(tool: Tool): Tool {
    const description = tool.description || '';
    if (!description.includes('読み取り専用')) {
      return {
        ...tool,
        description: `${description}（読み取り専用）`,
      };
    }
    return tool;
  }

  /**
   * ハンドラーを読み取り専用チェックでラップ
   * 要件6.3: データ変更を要求するツール呼び出しがあったとき、エラーメッセージを返す
   */
  private wrapHandlerWithReadOnlyCheck(
    handler: ToolHandler,
    toolName: string,
  ): ToolHandler {
    return async (args: Record<string, unknown>) => {
      // 引数に書き込み操作を示すパラメータが含まれていないかチェック
      // より正確な検出のため、完全一致または先頭一致をチェック
      const writeParams = [
        'create',
        'add',
        'update',
        'edit',
        'modify',
        'delete',
        'remove',
        'post',
        'put',
        'patch',
      ];

      const hasWriteParam = Object.keys(args).some((key) => {
        const lowerKey = key.toLowerCase();
        return writeParams.some((writeParam) => {
          return (
            lowerKey === writeParam || lowerKey.startsWith(`${writeParam}_`)
          );
        });
      });

      if (hasWriteParam) {
        const errorMessage = `読み取り専用制限違反: ツール "${toolName}" で書き込み操作を示すパラメータが検出されました。このMCPサーバーは読み取り専用です。`;
        logger.error(errorMessage, { toolName, args });
        throw new ReadOnlyViolationError(errorMessage);
      }

      // 実際のハンドラーを実行
      return await handler(args);
    };
  }

  /**
   * 登録されているツールの統計情報を取得
   */
  getToolStats(): {
    totalTools: number;
    toolNames: string[];
    readOnlyTools: number;
  } {
    const tools = this.getTools();
    const readOnlyTools = tools.filter((tool) =>
      (tool.description || '').includes('読み取り専用'),
    ).length;

    return {
      totalTools: tools.length,
      toolNames: tools.map((tool) => tool.name),
      readOnlyTools,
    };
  }
}
