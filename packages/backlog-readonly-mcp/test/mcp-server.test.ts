/**
 * MCPサーバーの基本動作テスト
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ToolRegistry } from '../src/tools/tool-registry.js';

// テスト用の型定義
interface TestConnectionResult {
  status: string;
  message: string;
  timestamp: string;
  capabilities: string[];
}

describe('MCP Server Basic Functionality', () => {
  let toolRegistry: ToolRegistry;

  beforeAll(() => {
    toolRegistry = new ToolRegistry();

    // テスト用のツールを登録
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
  });

  it('should create MCP server instance', () => {
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

    expect(server).toBeDefined();
  });

  it('should register and list tools correctly', () => {
    const tools = toolRegistry.getTools();

    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('test_connection');
    expect(tools[0].description).toContain('読み取り専用');
  });

  it('should execute test_connection tool successfully', async () => {
    const result = (await toolRegistry.executeTool(
      'test_connection',
      {},
    )) as TestConnectionResult;

    expect(result).toHaveProperty('status', 'success');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('capabilities');
    expect(result.capabilities).toContain('read-only');
  });

  it('should throw error for unknown tool', async () => {
    await expect(toolRegistry.executeTool('unknown_tool', {})).rejects.toThrow(
      'Unknown tool: unknown_tool',
    );
  });

  it('should check if tool exists', () => {
    expect(toolRegistry.hasTool('test_connection')).toBe(true);
    expect(toolRegistry.hasTool('unknown_tool')).toBe(false);
  });
});
