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
} from '@modelcontextprotocol/sdk/types.js';

// TODO: 他のモジュールをインポート
// import { BacklogApiClient } from './client/backlog-api-client.js';
// import { ConfigManager } from './config/config-manager.js';
// import { ToolRegistry } from './tools/tool-registry.js';

/**
 * MCPサーバーのメイン関数
 */
async function main() {
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
      tools: [
        // TODO: ツールを登録
      ],
    };
  });

  // ツール呼び出しの処理
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: toolArgs } = request.params;

    // TODO: ツール呼び出しの実装
    throw new Error(`Unknown tool: ${name}`);
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
