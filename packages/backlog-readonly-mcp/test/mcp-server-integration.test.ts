/**
 * MCPサーバー統合テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BacklogApiClient } from '../src/client/backlog-api-client.js';
import { ConfigManager } from '../src/config/config-manager.js';
import { ToolRegistry } from '../src/tools/tool-registry.js';
import { registerProjectTools } from '../src/tools/project-tools.js';
import type { BacklogProject } from '../src/types/index.js';

// モックデータ
const mockProject: BacklogProject = {
  id: 1,
  projectKey: 'TEST',
  name: 'テストプロジェクト',
  chartEnabled: true,
  subtaskingEnabled: true,
  projectLeaderCanEditProjectLeader: false,
  useWikiTreeView: true,
  textFormattingRule: 'markdown',
  archived: false,
  displayOrder: 1,
  useDevAttributes: false,
};

describe('MCPサーバー統合テスト', () => {
  let toolRegistry: ToolRegistry;
  let apiClient: BacklogApiClient;
  let configManager: ConfigManager;

  beforeEach(() => {
    // ConfigManagerのリセット
    configManager = ConfigManager.getInstance();
    configManager.reset();

    // 環境変数の設定
    process.env.BACKLOG_DOMAIN = 'test.backlog.com';
    process.env.BACKLOG_API_KEY = 'test-api-key';
    process.env.BACKLOG_DEFAULT_PROJECT = 'TEST';

    // 設定の読み込み
    configManager.loadConfig();

    // APIクライアントのモック
    apiClient = new BacklogApiClient(configManager);
    vi.spyOn(apiClient, 'get').mockImplementation(async (endpoint: string) => {
      if (endpoint === '/projects/TEST') {
        return mockProject;
      }
      throw new Error(`Unknown endpoint: ${endpoint}`);
    });

    // ツールレジストリの初期化
    toolRegistry = new ToolRegistry();
  });

  describe('MCPサーバーの基本動作', () => {
    it('ツールレジストリが正常に初期化される', () => {
      expect(toolRegistry).toBeDefined();
      expect(toolRegistry.getTools()).toEqual([]);
    });

    it('プロジェクトツールが正常に登録される', () => {
      registerProjectTools(toolRegistry, apiClient);

      const tools = toolRegistry.getTools();
      expect(tools.length).toBeGreaterThan(0);

      const toolNames = tools.map((tool) => tool.name);
      expect(toolNames).toContain('get_projects');
      expect(toolNames).toContain('get_project');
      expect(toolNames).toContain('get_project_users');
      expect(toolNames).toContain('get_default_project');
    });

    it('ツールが正常に実行される', async () => {
      registerProjectTools(toolRegistry, apiClient);

      const result = await toolRegistry.executeTool('get_project', {
        projectIdOrKey: 'TEST',
      });

      expect(result).toMatchObject({
        success: true,
        data: mockProject,
      });
    });

    it('存在しないツールの実行でエラーが発生する', async () => {
      await expect(
        toolRegistry.executeTool('non_existent_tool', {}),
      ).rejects.toThrow('Unknown tool: non_existent_tool');
    });
  });

  describe('設定管理', () => {
    it('設定が正常に読み込まれる', () => {
      const config = configManager.getConfig();

      expect(config.domain).toBe('test.backlog.com');
      expect(config.apiKey).toBe('test-api-key');
      expect(config.defaultProject).toBe('TEST');
    });

    it('APIキーがマスキングされる', () => {
      const maskedApiKey = configManager.getMaskedApiKey();

      expect(maskedApiKey).not.toBe('test-api-key');
      expect(maskedApiKey).toContain('*');
    });

    it('デフォルトプロジェクトが正常に解決される', () => {
      const resolved = configManager.resolveProjectIdOrKey();
      expect(resolved).toBe('TEST');

      const resolvedWithParam = configManager.resolveProjectIdOrKey('OTHER');
      expect(resolvedWithParam).toBe('OTHER');
    });
  });

  describe('エラーハンドリング', () => {
    it('APIエラーが適切に処理される', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('API Error'));

      registerProjectTools(toolRegistry, apiClient);

      await expect(
        toolRegistry.executeTool('get_project', { projectIdOrKey: 'TEST' }),
      ).rejects.toThrow();
    });

    it('デフォルトプロジェクト未設定時のエラーが適切に処理される', () => {
      // デフォルトプロジェクトを削除
      process.env.BACKLOG_DEFAULT_PROJECT = '';
      configManager.reset();
      configManager.loadConfig();

      expect(() => {
        configManager.resolveProjectIdOrKey();
      }).toThrow(
        'プロジェクトIDまたはキーが指定されておらず、デフォルトプロジェクトも設定されていません。',
      );
    });
  });
});
