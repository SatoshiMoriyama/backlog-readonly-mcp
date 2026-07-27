/**
 * ドキュメント関連ツール
 *
 * Backlogのドキュメント情報を取得するためのツールを提供します。
 */

import type { BacklogApiClient } from '../client/backlog-api-client.js';
import { ConfigManager } from '../config/config-manager.js';
import type { BacklogDocument, BacklogDocumentTree } from '../types/index.js';
import * as logger from '../utils/logger.js';
import { assertProjectWhitelistAllowed } from '../utils/whitelist-helpers.js';
import type { ToolRegistry } from './tool-registry.js';

/**
 * ドキュメント関連ツールを登録します
 */
export function registerDocumentTools(
  toolRegistry: ToolRegistry,
  apiClient: BacklogApiClient,
): void {
  // ドキュメント一覧取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_documents',
      description:
        'ドキュメント一覧を取得します（読み取り専用）。プロジェクトIDを指定しない場合、デフォルトプロジェクトが設定されていればそれを使用し、未設定なら参加している全プロジェクトのドキュメントを取得します。',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description:
              'プロジェクトIDまたはプロジェクトキー。省略時はデフォルトプロジェクトを使用し、デフォルトプロジェクトも未設定の場合は全プロジェクトから取得します。',
          },
          keyword: {
            type: 'string',
            description: '検索キーワード',
          },
          sort: {
            type: 'string',
            description: 'ソート項目（created: 作成日, updated: 更新日）',
          },
          order: {
            type: 'string',
            description: 'ソート順（asc: 昇順, desc: 降順）',
          },
          offset: {
            type: 'number',
            description: '取得開始位置（デフォルト: 0）',
          },
          count: {
            type: 'number',
            description: '取得件数（デフォルト: 20, 最大: 100）',
          },
        },
        required: [],
      },
    },
    async (args) => {
      const {
        projectId,
        keyword,
        sort,
        order,
        offset = 0,
        count = 20,
      } = args as {
        projectId?: string;
        keyword?: string;
        sort?: string;
        order?: string;
        offset?: number;
        count?: number;
      };

      const configManager = ConfigManager.getInstance();

      try {
        // プロジェクトIDの解決
        let resolvedProjectId: string | undefined;
        if (projectId) {
          resolvedProjectId = projectId;
        } else if (configManager.hasDefaultProject()) {
          resolvedProjectId = configManager.getDefaultProject();
        }

        // ホワイトリスト検証（プロジェクト指定がある場合）
        if (resolvedProjectId) {
          await assertProjectWhitelistAllowed(
            apiClient,
            configManager,
            resolvedProjectId,
          );
        }

        // クエリパラメータの構築
        const params: Record<string, unknown> = {
          offset,
          count: Math.min(count, 100),
        };

        if (resolvedProjectId) {
          // APIは projectId[] の形式で数値IDを受け付ける
          // プロジェクトキーが渡された場合はIDに変換する
          let numericProjectId: number | undefined;
          if (/^\d+$/.test(resolvedProjectId)) {
            numericProjectId = parseInt(resolvedProjectId, 10);
          } else {
            try {
              const project = await apiClient.get<{
                id: number;
                projectKey: string;
              }>(`/projects/${encodeURIComponent(resolvedProjectId)}`);
              numericProjectId = project.id;
            } catch (_error) {
              throw new Error(
                `プロジェクト "${resolvedProjectId}" の情報を取得できませんでした`,
              );
            }
          }
          params['projectId[]'] = [numericProjectId];
        }

        if (keyword) params.keyword = keyword;
        if (sort) params.sort = sort;
        if (order) params.order = order;

        let documents = await apiClient.get<BacklogDocument[]>(
          '/documents',
          params,
        );

        // ホワイトリストでフィルタリング（projectIdが指定されていない場合）
        const whitelistManager = configManager.getWhitelistManager();
        if (!resolvedProjectId && whitelistManager?.isWhitelistEnabled()) {
          let projectIdToKeyMap: Map<number, string> | null = null;
          try {
            const projects =
              await apiClient.get<Array<{ id: number; projectKey: string }>>(
                '/projects',
              );
            projectIdToKeyMap = new Map(
              projects.map((p) => [p.id, p.projectKey]),
            );
          } catch (projectError) {
            throw new Error(
              `プロジェクト一覧の取得に失敗しました: ${projectError instanceof Error ? projectError.message : '不明なエラー'}`,
            );
          }

          const originalCount = documents.length;
          documents = documents.filter((doc) => {
            const projectKey = projectIdToKeyMap?.get(doc.projectId);
            return whitelistManager.validateProjectAccess(
              String(doc.projectId),
              projectKey,
            );
          });

          if (originalCount > documents.length) {
            logger.info(
              `ドキュメント一覧をホワイトリストでフィルタリング: ${originalCount}件 → ${documents.length}件`,
            );
          }
        }

        // レスポンスから json フィールドを除外して plain のみ返す
        const sanitizedDocuments = documents.map((doc) => {
          const { json, ...rest } = doc as BacklogDocument & { json?: unknown };
          return rest;
        });

        return {
          success: true,
          data: sanitizedDocuments,
          count: sanitizedDocuments.length,
          message: `${sanitizedDocuments.length}件のドキュメントを取得しました`,
          searchParams: {
            projectId: resolvedProjectId,
            keyword,
            sort,
            order,
            offset,
            count: Math.min(count, 100),
          },
        };
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes('デフォルトプロジェクト') ||
            error.message.includes('ホワイトリスト'))
        ) {
          throw error;
        }
        throw new Error(
          `ドキュメント一覧の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );

  // ドキュメント詳細取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_document',
      description: '特定のドキュメントページの情報を取得します（読み取り専用）',
      inputSchema: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'ドキュメントのID（UUID形式）',
          },
        },
        required: ['documentId'],
      },
    },
    async (args) => {
      const { documentId } = args as { documentId: string };

      try {
        const document = await apiClient.get<BacklogDocument>(
          `/documents/${encodeURIComponent(documentId)}`,
        );

        // ホワイトリスト検証
        const configManager = ConfigManager.getInstance();
        await assertProjectWhitelistAllowed(
          apiClient,
          configManager,
          document.projectId,
        );

        // レスポンスから json フィールドを除外して plain のみ返す
        const { json, ...sanitizedDocument } = document as BacklogDocument & {
          json?: unknown;
        };

        return {
          success: true,
          data: sanitizedDocument,
          message: `ドキュメント "${document.title}" を取得しました`,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes('デフォルトプロジェクト') ||
            error.message.includes('ホワイトリスト'))
        ) {
          throw error;
        }
        throw new Error(
          `ドキュメントの取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );

  // ドキュメントツリー取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_document_tree',
      description:
        'プロジェクトのドキュメントツリー構造を取得します（読み取り専用）。ドキュメントの親子関係を把握できます。',
      inputSchema: {
        type: 'object',
        properties: {
          projectIdOrKey: {
            type: 'string',
            description:
              'プロジェクトIDまたはプロジェクトキー。省略時はデフォルトプロジェクトを使用します。',
          },
        },
        required: [],
      },
    },
    async (args) => {
      const { projectIdOrKey } = args as { projectIdOrKey?: string };

      const configManager = ConfigManager.getInstance();

      try {
        // プロジェクトIDの解決
        let resolvedProjectIdOrKey: string;
        if (projectIdOrKey) {
          resolvedProjectIdOrKey = projectIdOrKey;
        } else if (configManager.hasDefaultProject()) {
          resolvedProjectIdOrKey = configManager.getDefaultProject() ?? '';
        } else {
          throw new Error(
            'プロジェクトIDまたはプロジェクトキーを指定してください。デフォルトプロジェクトが設定されていません。',
          );
        }

        // ホワイトリスト検証
        await assertProjectWhitelistAllowed(
          apiClient,
          configManager,
          resolvedProjectIdOrKey,
        );

        const tree = await apiClient.get<BacklogDocumentTree>(
          '/documents/tree',
          { projectIdOrKey: resolvedProjectIdOrKey },
        );

        return {
          success: true,
          data: tree,
          message: `プロジェクト "${resolvedProjectIdOrKey}" のドキュメントツリーを取得しました`,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes('デフォルトプロジェクト') ||
            error.message.includes('ホワイトリスト'))
        ) {
          throw error;
        }
        throw new Error(
          `ドキュメントツリーの取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );
}
