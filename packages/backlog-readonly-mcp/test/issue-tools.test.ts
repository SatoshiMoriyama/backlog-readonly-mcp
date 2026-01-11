/**
 * 課題ツールのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BacklogApiClient } from '../src/client/backlog-api-client.js';
import { ConfigManager } from '../src/config/config-manager.js';
import { ToolRegistry } from '../src/tools/tool-registry.js';
import { registerIssueTools } from '../src/tools/issue-tools.js';
import type {
  BacklogIssue,
  BacklogComment,
  Attachment,
} from '../src/types/index.js';

// モックデータ
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

const mockComment: BacklogComment = {
  id: 1,
  content: 'テストコメント',
  changeLog: [],
  createdUser: {
    id: 1,
    userId: 'test',
    name: 'テストユーザー',
    roleType: 1,
    lang: 'ja',
    mailAddress: 'test@example.com',
  },
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z',
  stars: [],
  notifications: [],
};

const mockAttachment: Attachment = {
  id: 1,
  name: 'test.txt',
  size: 1024,
  createdUser: {
    id: 1,
    userId: 'test',
    name: 'テストユーザー',
    roleType: 1,
    lang: 'ja',
    mailAddress: 'test@example.com',
  },
  created: '2024-01-01T00:00:00Z',
};

describe('Issue Tools', () => {
  let toolRegistry: ToolRegistry;
  let mockApiClient: BacklogApiClient;
  let mockConfigManager: ConfigManager;

  beforeEach(() => {
    // ConfigManagerのモック
    mockConfigManager = {
      hasDefaultProject: vi.fn().mockReturnValue(true),
      getDefaultProject: vi.fn().mockReturnValue('TEST'),
      resolveProjectIdOrKey: vi.fn().mockImplementation((id) => id || 'TEST'),
    } as unknown as ConfigManager;

    // ConfigManager.getInstanceをモック
    vi.spyOn(ConfigManager, 'getInstance').mockReturnValue(mockConfigManager);

    // APIクライアントのモック
    mockApiClient = {
      get: vi.fn(),
    } as unknown as BacklogApiClient;

    // ツールレジストリの初期化
    toolRegistry = new ToolRegistry();
    registerIssueTools(toolRegistry, mockApiClient);
  });

  describe('get_issues', () => {
    it('課題一覧を正常に取得できる', async () => {
      const mockIssues = [mockIssue];
      vi.mocked(mockApiClient.get).mockResolvedValue(mockIssues);

      const result = await toolRegistry.executeTool('get_issues', {});

      expect(mockApiClient.get).toHaveBeenCalledWith('/issues', {
        projectId: ['TEST'],
        offset: 0,
        count: 20,
      });
      expect(result).toEqual({
        success: true,
        data: mockIssues,
        count: 1,
        offset: 0,
        message: '1件の課題を取得しました（デフォルトプロジェクト）',
        isDefaultProject: true,
        searchParams: {
          projectId: ['TEST'],
          offset: 0,
          count: 20,
        },
      });
    });

    it('検索条件を指定して課題一覧を取得できる', async () => {
      const mockIssues = [mockIssue];
      vi.mocked(mockApiClient.get).mockResolvedValue(mockIssues);

      const searchParams = {
        projectId: 'CUSTOM',
        statusId: [1, 2],
        keyword: 'テスト',
        count: 50,
      };

      const result = await toolRegistry.executeTool('get_issues', searchParams);

      expect(mockApiClient.get).toHaveBeenCalledWith('/issues', {
        projectId: ['CUSTOM'],
        statusId: [1, 2],
        keyword: 'テスト',
        offset: 0,
        count: 50,
      });
      expect(result).toEqual({
        success: true,
        data: mockIssues,
        count: 1,
        offset: 0,
        message: '1件の課題を取得しました',
        isDefaultProject: false,
        searchParams: {
          projectId: ['CUSTOM'],
          statusId: [1, 2],
          keyword: 'テスト',
          offset: 0,
          count: 50,
        },
      });
    });

    it('取得件数の上限が100件に制限される', async () => {
      const mockIssues = [mockIssue];
      vi.mocked(mockApiClient.get).mockResolvedValue(mockIssues);

      await toolRegistry.executeTool('get_issues', { count: 200 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/issues', {
        projectId: ['TEST'],
        offset: 0,
        count: 100, // 200が100に制限される
      });
    });
  });

  describe('get_issue', () => {
    it('課題詳細を正常に取得できる', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue(mockIssue);

      const result = await toolRegistry.executeTool('get_issue', {
        issueIdOrKey: 'TEST-1',
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/issues/TEST-1');
      expect(result).toEqual({
        success: true,
        data: mockIssue,
        message: '課題 "TEST-1: テスト課題" の詳細情報を取得しました',
      });
    });

    it('課題IDでも取得できる', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue(mockIssue);

      await toolRegistry.executeTool('get_issue', { issueIdOrKey: '12345' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/issues/12345');
    });
  });

  describe('get_issue_comments', () => {
    it('課題コメントを正常に取得できる', async () => {
      const mockComments = [mockComment];
      vi.mocked(mockApiClient.get).mockResolvedValue(mockComments);

      const result = await toolRegistry.executeTool('get_issue_comments', {
        issueIdOrKey: 'TEST-1',
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/issues/TEST-1/comments',
        {
          count: 20,
          order: 'asc',
        },
      );
      expect(result).toEqual({
        success: true,
        data: mockComments,
        count: 1,
        message: '課題 "TEST-1" のコメント 1件を取得しました',
        searchParams: {
          count: 20,
          order: 'asc',
        },
      });
    });

    it('コメント取得のパラメータを指定できる', async () => {
      const mockComments = [mockComment];
      vi.mocked(mockApiClient.get).mockResolvedValue(mockComments);

      await toolRegistry.executeTool('get_issue_comments', {
        issueIdOrKey: 'TEST-1',
        minId: 10,
        maxId: 100,
        count: 50,
        order: 'desc',
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/issues/TEST-1/comments',
        {
          minId: 10,
          maxId: 100,
          count: 50,
          order: 'desc',
        },
      );
    });

    it('コメント取得件数の上限が100件に制限される', async () => {
      const mockComments = [mockComment];
      vi.mocked(mockApiClient.get).mockResolvedValue(mockComments);

      await toolRegistry.executeTool('get_issue_comments', {
        issueIdOrKey: 'TEST-1',
        count: 200,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/issues/TEST-1/comments',
        {
          count: 100, // 200が100に制限される
          order: 'asc',
        },
      );
    });
  });

  describe('get_issue_attachments', () => {
    it('課題添付ファイルを正常に取得できる', async () => {
      const mockAttachments = [mockAttachment];
      vi.mocked(mockApiClient.get).mockResolvedValue(mockAttachments);

      const result = await toolRegistry.executeTool('get_issue_attachments', {
        issueIdOrKey: 'TEST-1',
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/issues/TEST-1/attachments',
      );
      expect(result).toEqual({
        success: true,
        data: mockAttachments,
        count: 1,
        message: '課題 "TEST-1" の添付ファイル 1件を取得しました',
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('API呼び出しエラーを適切に処理する', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValue(new Error('API Error'));

      await expect(
        toolRegistry.executeTool('get_issue', { issueIdOrKey: 'TEST-1' }),
      ).rejects.toThrow('課題詳細の取得に失敗しました: API Error');
    });

    it('課題一覧取得のエラーを適切に処理する', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValue(
        new Error('Network Error'),
      );

      await expect(toolRegistry.executeTool('get_issues', {})).rejects.toThrow(
        '課題一覧の取得に失敗しました: Network Error',
      );
    });
  });
});
