/**
 * 課題関連ツール
 *
 * Backlogの課題情報を取得するためのツールを提供します。
 */

import type { BacklogApiClient } from '../client/backlog-api-client.js';
import type { ToolRegistry } from './tool-registry.js';
import type {
  BacklogIssue,
  BacklogComment,
  Attachment,
} from '../types/index.js';
import { ConfigManager } from '../config/config-manager.js';

/**
 * 課題関連ツールを登録します
 */
export function registerIssueTools(
  toolRegistry: ToolRegistry,
  apiClient: BacklogApiClient,
): void {
  // 課題一覧取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_issues',
      description:
        '課題一覧を取得します（読み取り専用）。検索条件を指定して絞り込み可能です。',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description:
              'プロジェクトIDまたはキー（省略時はデフォルトプロジェクトを使用）',
          },
          issueTypeId: {
            type: 'array',
            items: { type: 'number' },
            description: '課題種別ID（複数指定可能）',
          },
          categoryId: {
            type: 'array',
            items: { type: 'number' },
            description: 'カテゴリID（複数指定可能）',
          },
          versionId: {
            type: 'array',
            items: { type: 'number' },
            description: 'バージョンID（複数指定可能）',
          },
          milestoneId: {
            type: 'array',
            items: { type: 'number' },
            description: 'マイルストーンID（複数指定可能）',
          },
          statusId: {
            type: 'array',
            items: { type: 'number' },
            description: 'ステータスID（複数指定可能）',
          },
          priorityId: {
            type: 'array',
            items: { type: 'number' },
            description: '優先度ID（複数指定可能）',
          },
          assigneeId: {
            type: 'array',
            items: { type: 'number' },
            description: '担当者ID（複数指定可能）',
          },
          createdUserId: {
            type: 'array',
            items: { type: 'number' },
            description: '作成者ID（複数指定可能）',
          },
          resolutionId: {
            type: 'array',
            items: { type: 'number' },
            description: '完了理由ID（複数指定可能）',
          },
          parentChild: {
            type: 'string',
            enum: ['all', 'parent', 'child', 'notChild'],
            description:
              '親子課題の絞り込み（all: すべて, parent: 親課題のみ, child: 子課題のみ, notChild: 子課題以外）',
          },
          attachment: {
            type: 'boolean',
            description: '添付ファイルの有無で絞り込み',
          },
          sharedFile: {
            type: 'boolean',
            description: '共有ファイルの有無で絞り込み',
          },
          sort: {
            type: 'string',
            enum: [
              'issueType',
              'category',
              'version',
              'milestone',
              'summary',
              'status',
              'priority',
              'attachment',
              'sharedFile',
              'created',
              'createdUser',
              'updated',
              'updatedUser',
              'assignee',
              'startDate',
              'dueDate',
              'estimatedHours',
              'actualHours',
              'childIssue',
            ],
            description: 'ソート項目',
          },
          order: {
            type: 'string',
            enum: ['asc', 'desc'],
            description: 'ソート順（asc: 昇順, desc: 降順）',
          },
          offset: {
            type: 'number',
            description: 'オフセット（デフォルト: 0）',
          },
          count: {
            type: 'number',
            description: '取得件数（デフォルト: 20, 最大: 100）',
          },
          createdSince: {
            type: 'string',
            description: '作成日の開始日（YYYY-MM-DD形式）',
          },
          createdUntil: {
            type: 'string',
            description: '作成日の終了日（YYYY-MM-DD形式）',
          },
          updatedSince: {
            type: 'string',
            description: '更新日の開始日（YYYY-MM-DD形式）',
          },
          updatedUntil: {
            type: 'string',
            description: '更新日の終了日（YYYY-MM-DD形式）',
          },
          startDateSince: {
            type: 'string',
            description: '開始日の開始日（YYYY-MM-DD形式）',
          },
          startDateUntil: {
            type: 'string',
            description: '開始日の終了日（YYYY-MM-DD形式）',
          },
          dueDateSince: {
            type: 'string',
            description: '期限日の開始日（YYYY-MM-DD形式）',
          },
          dueDateUntil: {
            type: 'string',
            description: '期限日の終了日（YYYY-MM-DD形式）',
          },
          keyword: {
            type: 'string',
            description: 'キーワード検索（件名と詳細を対象）',
          },
        },
        required: [],
      },
    },
    async (args) => {
      const configManager = ConfigManager.getInstance();
      const {
        projectId,
        issueTypeId,
        categoryId,
        versionId,
        milestoneId,
        statusId,
        priorityId,
        assigneeId,
        createdUserId,
        resolutionId,
        parentChild,
        attachment,
        sharedFile,
        sort,
        order,
        offset = 0,
        count = 20,
        createdSince,
        createdUntil,
        updatedSince,
        updatedUntil,
        startDateSince,
        startDateUntil,
        dueDateSince,
        dueDateUntil,
        keyword,
      } = args as {
        projectId?: string;
        issueTypeId?: number[];
        categoryId?: number[];
        versionId?: number[];
        milestoneId?: number[];
        statusId?: number[];
        priorityId?: number[];
        assigneeId?: number[];
        createdUserId?: number[];
        resolutionId?: number[];
        parentChild?: string;
        attachment?: boolean;
        sharedFile?: boolean;
        sort?: string;
        order?: string;
        offset?: number;
        count?: number;
        createdSince?: string;
        createdUntil?: string;
        updatedSince?: string;
        updatedUntil?: string;
        startDateSince?: string;
        startDateUntil?: string;
        dueDateSince?: string;
        dueDateUntil?: string;
        keyword?: string;
      };

      try {
        // プロジェクトIDの解決
        let resolvedProjectId: string | undefined;
        if (projectId) {
          resolvedProjectId = projectId;
        } else if (configManager.hasDefaultProject()) {
          resolvedProjectId = configManager.getDefaultProject();
        }

        // クエリパラメータの構築
        const params: Record<string, unknown> = {};

        if (resolvedProjectId) {
          params.projectId = [resolvedProjectId];
        }
        if (issueTypeId) params.issueTypeId = issueTypeId;
        if (categoryId) params.categoryId = categoryId;
        if (versionId) params.versionId = versionId;
        if (milestoneId) params.milestoneId = milestoneId;
        if (statusId) params.statusId = statusId;
        if (priorityId) params.priorityId = priorityId;
        if (assigneeId) params.assigneeId = assigneeId;
        if (createdUserId) params.createdUserId = createdUserId;
        if (resolutionId) params.resolutionId = resolutionId;
        if (parentChild) params.parentChild = parentChild;
        if (attachment !== undefined) params.attachment = attachment;
        if (sharedFile !== undefined) params.sharedFile = sharedFile;
        if (sort) params.sort = sort;
        if (order) params.order = order;
        if (offset !== undefined) params.offset = offset;
        if (count !== undefined) params.count = Math.min(count, 100); // 最大100件に制限
        if (createdSince) params.createdSince = createdSince;
        if (createdUntil) params.createdUntil = createdUntil;
        if (updatedSince) params.updatedSince = updatedSince;
        if (updatedUntil) params.updatedUntil = updatedUntil;
        if (startDateSince) params.startDateSince = startDateSince;
        if (startDateUntil) params.startDateUntil = startDateUntil;
        if (dueDateSince) params.dueDateSince = dueDateSince;
        if (dueDateUntil) params.dueDateUntil = dueDateUntil;
        if (keyword) params.keyword = keyword;

        const issues = await apiClient.get<BacklogIssue[]>('/issues', params);

        const isDefaultProject =
          !projectId && configManager.hasDefaultProject();

        return {
          success: true,
          data: issues,
          count: issues.length,
          offset,
          message: `${issues.length}件の課題を取得しました${isDefaultProject ? '（デフォルトプロジェクト）' : ''}`,
          isDefaultProject,
          searchParams: params,
        };
      } catch (error) {
        throw new Error(
          `課題一覧の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );

  // 課題詳細取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_issue',
      description: '課題の詳細情報を取得します（読み取り専用）',
      inputSchema: {
        type: 'object',
        properties: {
          issueIdOrKey: {
            type: 'string',
            description:
              '課題IDまたは課題キー（例: "MYPROJ-123" または "12345"）',
          },
        },
        required: ['issueIdOrKey'],
      },
    },
    async (args) => {
      const { issueIdOrKey } = args as { issueIdOrKey: string };

      try {
        const issue = await apiClient.get<BacklogIssue>(
          `/issues/${encodeURIComponent(issueIdOrKey)}`,
        );

        return {
          success: true,
          data: issue,
          message: `課題 "${issue.issueKey}: ${issue.summary}" の詳細情報を取得しました`,
        };
      } catch (error) {
        throw new Error(
          `課題詳細の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );

  // 課題コメント取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_issue_comments',
      description: '課題のコメント一覧を取得します（読み取り専用）',
      inputSchema: {
        type: 'object',
        properties: {
          issueIdOrKey: {
            type: 'string',
            description:
              '課題IDまたは課題キー（例: "MYPROJ-123" または "12345"）',
          },
          minId: {
            type: 'number',
            description: '最小コメントID（この値より大きいIDのコメントを取得）',
          },
          maxId: {
            type: 'number',
            description: '最大コメントID（この値より小さいIDのコメントを取得）',
          },
          count: {
            type: 'number',
            description: '取得件数（デフォルト: 20, 最大: 100）',
          },
          order: {
            type: 'string',
            enum: ['asc', 'desc'],
            description: 'ソート順（asc: 昇順, desc: 降順、デフォルト: asc）',
          },
        },
        required: ['issueIdOrKey'],
      },
    },
    async (args) => {
      const {
        issueIdOrKey,
        minId,
        maxId,
        count = 20,
        order = 'asc',
      } = args as {
        issueIdOrKey: string;
        minId?: number;
        maxId?: number;
        count?: number;
        order?: string;
      };

      try {
        const params: Record<string, unknown> = {
          count: Math.min(count, 100), // 最大100件に制限
          order,
        };

        if (minId !== undefined) params.minId = minId;
        if (maxId !== undefined) params.maxId = maxId;

        const comments = await apiClient.get<BacklogComment[]>(
          `/issues/${encodeURIComponent(issueIdOrKey)}/comments`,
          params,
        );

        return {
          success: true,
          data: comments,
          count: comments.length,
          message: `課題 "${issueIdOrKey}" のコメント ${comments.length}件を取得しました`,
          searchParams: params,
        };
      } catch (error) {
        throw new Error(
          `課題コメントの取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );

  // 課題添付ファイル取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_issue_attachments',
      description: '課題の添付ファイル一覧を取得します（読み取り専用）',
      inputSchema: {
        type: 'object',
        properties: {
          issueIdOrKey: {
            type: 'string',
            description:
              '課題IDまたは課題キー（例: "MYPROJ-123" または "12345"）',
          },
        },
        required: ['issueIdOrKey'],
      },
    },
    async (args) => {
      const { issueIdOrKey } = args as { issueIdOrKey: string };

      try {
        const attachments = await apiClient.get<Attachment[]>(
          `/issues/${encodeURIComponent(issueIdOrKey)}/attachments`,
        );

        return {
          success: true,
          data: attachments,
          count: attachments.length,
          message: `課題 "${issueIdOrKey}" の添付ファイル ${attachments.length}件を取得しました`,
        };
      } catch (error) {
        throw new Error(
          `課題添付ファイルの取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );
}
