#!/usr/bin/env node

/**
 * Backlog読み取り専用MCPサーバー
 *
 * このサーバーはBacklog APIを使用してプロジェクト、課題、ユーザー情報などを
 * 読み取り専用で提供するMCPサーバーです。
 * 要件7.1-7.5: 包括的エラーハンドリング、ログ機能
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// 必要なモジュールをインポート
import { BacklogApiClient } from './client/backlog-api-client.js';
import { ConfigManager } from './config/config-manager.js';
import { registerIssueTools } from './tools/issue-tools.js';
import { registerMasterDataTools } from './tools/master-data-tools.js';
import { registerProjectTools } from './tools/project-tools.js';
import { ToolRegistry } from './tools/tool-registry.js';
import { registerUserTools } from './tools/user-tools.js';
import { registerWikiTools } from './tools/wiki-tools.js';
import {
  AuthenticationError,
  NetworkError,
  ReadOnlyViolationError,
} from './types/index.js';
import * as logger from './utils/logger.js';

/**
 * MCPサーバーのメイン関数
 */
async function main() {
  try {
    logger.info('Backlog読み取り専用MCPサーバーを起動中...');

    // 設定管理とAPIクライアントの初期化
    const configManager = ConfigManager.getInstance();
    configManager.loadConfig();

    // APIキーの有効性を検証
    const apiClient = new BacklogApiClient(configManager);
    const isValidApiKey = await apiClient.validateApiKey();

    if (!isValidApiKey) {
      const errorMessage =
        'APIキーが無効です。BACKLOG_API_KEYの設定を確認してください。';
      logger.error(errorMessage);
      throw new AuthenticationError(errorMessage);
    }

    // ツールレジストリの初期化
    const toolRegistry = new ToolRegistry();

    // 基本的なテストツールを追加
    toolRegistry.registerTool(
      {
        name: 'test_connection',
        description: 'MCPサーバーの接続をテストします（読み取り専用）',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      async () => {
        logger.info('接続テストが実行されました');
        return {
          status: 'success',
          message: 'Backlog読み取り専用MCPサーバーが正常に動作しています',
          timestamp: new Date().toISOString(),
          capabilities: ['read-only', 'projects', 'issues', 'users', 'wikis'],
          config: apiClient.getConfigInfo(),
        };
      },
    );

    // プロジェクト関連ツールの登録
    registerProjectTools(toolRegistry, apiClient);

    // 課題関連ツールの登録
    registerIssueTools(toolRegistry, apiClient);

    // ユーザー関連ツールの登録
    registerUserTools(toolRegistry, apiClient);

    // Wiki関連ツールの登録
    registerWikiTools(toolRegistry, apiClient);

    // マスタデータ関連ツールの登録
    registerMasterDataTools(toolRegistry, apiClient);

    const server = new Server(
      {
        name: 'backlog-readonly-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    // ツール一覧の取得
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        logger.debug('ツール一覧が要求されました');
        const tools = toolRegistry.getTools();
        logger.debug(`${tools.length}個のツールを返します`);
        return { tools };
      } catch (error) {
        logger.logError('ツール一覧の取得に失敗しました', error);
        throw new McpError(
          ErrorCode.InternalError,
          'ツール一覧の取得中にエラーが発生しました',
        );
      }
    });

    // ツール呼び出しの処理
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: toolArgs } = request.params;
      const startTime = Date.now();

      try {
        logger.info(`ツール実行開始: ${name}`, { args: toolArgs });

        const result = await toolRegistry.executeTool(name, toolArgs || {});

        const duration = Date.now() - startTime;
        logger.info(`ツール実行完了: ${name} (${duration}ms)`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logError(`ツール実行失敗: ${name} (${duration}ms)`, error, {
          toolName: name,
          args: toolArgs,
        });

        // エラーの種類に応じて適切なMcpErrorを生成（型ベース）
        if (error instanceof ReadOnlyViolationError) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `読み取り専用制限: ${error.message}`,
          );
        }

        if (error instanceof AuthenticationError) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `認証エラー: ${error.message}`,
          );
        }

        if (error instanceof NetworkError) {
          throw new McpError(
            ErrorCode.InternalError,
            `接続エラー: ${error.message}`,
          );
        }

        if (error instanceof Error) {
          // その他のエラー
          throw new McpError(ErrorCode.InternalError, error.message);
        }

        throw new McpError(
          ErrorCode.InternalError,
          '不明なエラーが発生しました',
        );
      }
    });

    // サーバーの起動
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('Backlog読み取り専用MCPサーバーが正常に起動しました', {
      tools: toolRegistry.getTools().length,
      config: apiClient.getConfigInfo(),
    });
  } catch (error) {
    logger.logError('サーバー起動中にエラーが発生しました', error);
    process.exit(1);
  }
}

// エラーハンドリング
process.on('SIGINT', async () => {
  logger.info('SIGINTを受信しました。サーバーを停止しています...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERMを受信しました。サーバーを停止しています...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未処理のPromise拒否が発生しました', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString(),
  });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('未処理の例外が発生しました', {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// メイン関数の実行
main().catch((error) => {
  logger.logError('サーバー起動エラー', error);
  process.exit(1);
});
