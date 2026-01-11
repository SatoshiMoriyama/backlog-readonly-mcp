/**
 * MCPサーバー統合テスト
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BacklogApiClient } from '../src/client/backlog-api-client.js';
import { ConfigManager } from '../src/config/config-manager.js';
import { registerIssueTools } from '../src/tools/issue-tools.js';
import { registerProjectTools } from '../src/tools/project-tools.js';
import { ToolRegistry } from '../src/tools/tool-registry.js';
import type { BacklogIssue, BacklogProject } from '../src/types/index.js';

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

const mockIssue: BacklogIssue = {
  id: 1,
  projectId: 1,
  issueKey: 'TEST-1',
  keyId: 1,
  issueType: {
    id: 1,
    projectId: 1,
    name: 'タスク',
    color: '#7ea800',
    displayOrder: 1,
  },
  summary: 'テスト課題',
  description: 'テスト課題の説明',
  resolution: null,
  priority: { id: 3, name: '中' },
  status: {
    id: 1,
    projectId: 1,
    name: '未対応',
    color: '#ed8077',
    displayOrder: 1,
  },
  assignee: null,
  category: [],
  versions: [],
  milestone: [],
  startDate: null,
  dueDate: null,
  estimatedHours: null,
  actualHours: null,
  parentIssueId: null,
  createdUser: {
    id: 1,
    userId: 'test',
    name: 'テストユーザー',
    roleType: 1,
    lang: 'ja',
    mailAddress: 'test@example.com',
  },
  created: '2024-01-01T00:00:00Z',
  updatedUser: {
    id: 1,
    userId: 'test',
    name: 'テストユーザー',
    roleType: 1,
    lang: 'ja',
    mailAddress: 'test@example.com',
  },
  updated: '2024-01-01T00:00:00Z',
  customFields: [],
  attachments: [],
  sharedFiles: [],
  stars: [],
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
      if (endpoint === '/issues') {
        return [mockIssue];
      }
      if (endpoint === '/issues/TEST-1') {
        return mockIssue;
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

    it('課題ツールが正常に登録される', () => {
      registerIssueTools(toolRegistry, apiClient);

      const tools = toolRegistry.getTools();
      expect(tools.length).toBeGreaterThan(0);

      const toolNames = tools.map((tool) => tool.name);
      expect(toolNames).toContain('get_issues');
      expect(toolNames).toContain('get_issue');
      expect(toolNames).toContain('get_issue_comments');
      expect(toolNames).toContain('get_issue_attachments');
    });

    it('すべてのツールが正常に登録される', () => {
      registerProjectTools(toolRegistry, apiClient);
      registerIssueTools(toolRegistry, apiClient);

      const tools = toolRegistry.getTools();
      expect(tools.length).toBe(8); // プロジェクト4つ + 課題4つ

      const toolNames = tools.map((tool) => tool.name);
      // プロジェクトツール
      expect(toolNames).toContain('get_projects');
      expect(toolNames).toContain('get_project');
      expect(toolNames).toContain('get_project_users');
      expect(toolNames).toContain('get_default_project');
      // 課題ツール
      expect(toolNames).toContain('get_issues');
      expect(toolNames).toContain('get_issue');
      expect(toolNames).toContain('get_issue_comments');
      expect(toolNames).toContain('get_issue_attachments');
    });

    it('ツールが正常に実行される', async () => {
      registerProjectTools(toolRegistry, apiClient);
      registerIssueTools(toolRegistry, apiClient);

      // プロジェクトツールのテスト
      const projectResult = await toolRegistry.executeTool('get_project', {
        projectIdOrKey: 'TEST',
      });

      expect(projectResult).toMatchObject({
        success: true,
        data: mockProject,
      });

      // 課題ツールのテスト
      const issueResult = await toolRegistry.executeTool('get_issue', {
        issueIdOrKey: 'TEST-1',
      });

      expect(issueResult).toMatchObject({
        success: true,
        data: mockIssue,
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
