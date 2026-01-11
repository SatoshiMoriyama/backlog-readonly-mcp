/**
 * プロジェクトツールのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BacklogApiClient } from '../src/client/backlog-api-client.js';
import { ConfigManager } from '../src/config/config-manager.js';
import { ToolRegistry } from '../src/tools/tool-registry.js';
import { registerProjectTools } from '../src/tools/project-tools.js';
import type { BacklogProject, BacklogUser } from '../src/types/index.js';

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

const mockProjects: BacklogProject[] = [mockProject];

const mockUsers: BacklogUser[] = [
  {
    id: 1,
    userId: 'test-user',
    name: 'テストユーザー',
    roleType: 1,
    lang: 'ja',
    mailAddress: 'test@example.com',
  },
];

describe('プロジェクトツール', () => {
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
      if (endpoint === '/projects') {
        return mockProjects;
      }
      if (endpoint === '/projects/TEST') {
        return mockProject;
      }
      if (endpoint === '/projects/TEST/users') {
        return mockUsers;
      }
      throw new Error(`Unknown endpoint: ${endpoint}`);
    });

    // ツールレジストリの初期化
    toolRegistry = new ToolRegistry();
    registerProjectTools(toolRegistry, apiClient);
  });

  describe('get_projects', () => {
    it('プロジェクト一覧を取得できる', async () => {
      const result = await toolRegistry.executeTool('get_projects', {});

      expect(result).toEqual({
        success: true,
        data: mockProjects,
        count: 1,
        message: '1件のプロジェクトを取得しました',
      });
    });

    it('アーカイブされたプロジェクトも含めて取得できる', async () => {
      const result = await toolRegistry.executeTool('get_projects', {
        archived: true,
      });

      expect(result).toEqual({
        success: true,
        data: mockProjects,
        count: 1,
        message: '1件のプロジェクトを取得しました',
      });
    });
  });

  describe('get_project', () => {
    it('プロジェクト詳細を取得できる', async () => {
      const result = await toolRegistry.executeTool('get_project', {
        projectIdOrKey: 'TEST',
      });

      expect(result).toMatchObject({
        success: true,
        data: mockProject,
        message: 'プロジェクト "テストプロジェクト" の詳細情報を取得しました',
        isDefaultProject: false,
      });
    });

    it('デフォルトプロジェクトを使用してプロジェクト詳細を取得できる', async () => {
      const result = await toolRegistry.executeTool('get_project', {});

      expect(result).toMatchObject({
        success: true,
        data: mockProject,
        message:
          'プロジェクト "テストプロジェクト" の詳細情報を取得しました（デフォルトプロジェクト）',
        isDefaultProject: true,
      });
    });
  });

  describe('get_project_users', () => {
    it('プロジェクトメンバーを取得できる', async () => {
      const result = await toolRegistry.executeTool('get_project_users', {
        projectIdOrKey: 'TEST',
      });

      expect(result).toMatchObject({
        success: true,
        data: mockUsers,
        count: 1,
        message: 'プロジェクトのメンバー 1名を取得しました',
        isDefaultProject: false,
      });
    });

    it('デフォルトプロジェクトを使用してプロジェクトメンバーを取得できる', async () => {
      const result = await toolRegistry.executeTool('get_project_users', {});

      expect(result).toMatchObject({
        success: true,
        data: mockUsers,
        count: 1,
        message:
          'プロジェクトのメンバー 1名を取得しました（デフォルトプロジェクト）',
        isDefaultProject: true,
      });
    });
  });

  describe('get_default_project', () => {
    it('デフォルトプロジェクト情報を取得できる', async () => {
      const result = await toolRegistry.executeTool('get_default_project', {});

      expect(result).toMatchObject({
        success: true,
        data: mockProject,
        message:
          'デフォルトプロジェクト "テストプロジェクト" の情報を取得しました',
        defaultProjectKey: 'TEST',
      });
    });
  });

  describe('ツール登録', () => {
    it('すべてのプロジェクトツールが登録されている', () => {
      const tools = toolRegistry.getTools();
      const toolNames = tools.map((tool) => tool.name);

      expect(toolNames).toContain('get_projects');
      expect(toolNames).toContain('get_project');
      expect(toolNames).toContain('get_project_users');
      expect(toolNames).toContain('get_default_project');
    });

    it('各ツールが適切な説明を持っている', () => {
      const tools = toolRegistry.getTools();

      for (const tool of tools) {
        expect(tool.description).toBeTruthy();
        expect(tool.description).toContain('読み取り専用');
      }
    });
  });
});
