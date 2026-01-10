#!/usr/bin/env node

/**
 * Backlog読み取り専用MCPサーバー
 *
 * このサーバーはBacklog APIを使用してプロジェクト、課題、ユーザー情報などを
 * 読み取り専用で提供するMCPサーバーです。
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// 必要なモジュールをインポート
import { BacklogApiClient } from './client/backlog-api-client.js';
import { ConfigManager } from './config/config-manager.js';
import { ToolRegistry } from './tools/tool-registry.js';

/**
 * MCPサーバーのメイン関数
 */
async function main() {
  // 設定管理とAPIクライアントの初期化
  const configManager = ConfigManager.getInstance();
  configManager.loadConfig();
  const apiClient = new BacklogApiClient(configManager);

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
      return {
        status: 'success',
        message: 'Backlog読み取り専用MCPサーバーが正常に動作しています',
        timestamp: new Date().toISOString(),
        capabilities: ['read-only', 'projects', 'issues', 'users', 'wikis'],
      };
    },
  );

  // TODO: ツールの登録
  // registerProjectTools(toolRegistry, apiClient);
  // registerIssueTools(toolRegistry, apiClient);
  // registerUserTools(toolRegistry, apiClient);
  // registerWikiTools(toolRegistry, apiClient);
  // registerMasterDataTools(toolRegistry, apiClient);

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
    return {
      tools: toolRegistry.getTools(),
    };
  });

  // ツール呼び出しの処理
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: toolArgs } = request.params;

    try {
      const result = await toolRegistry.executeTool(name, toolArgs || {});
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new McpError(ErrorCode.InternalError, error.message);
      }
      throw new McpError(ErrorCode.InternalError, 'Unknown error');
    }
  });

  // サーバーの起動
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Backlog読み取り専用MCPサーバーが起動しました');
}

// エラーハンドリング
process.on('SIGINT', async () => {
  console.error('サーバーを停止しています...');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('未処理のPromise拒否:', error);
  process.exit(1);
});

// メイン関数の実行
main().catch((error) => {
  console.error('サーバー起動エラー:', error);
  process.exit(1);
});
