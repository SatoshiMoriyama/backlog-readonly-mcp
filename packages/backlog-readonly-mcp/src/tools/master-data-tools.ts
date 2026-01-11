/**
 * マスタデータ関連ツール
 *
 * Backlogのマスタデータ（優先度、ステータス、完了理由、カテゴリ）を取得するためのツールを提供します。
 */

import type { BacklogApiClient } from '../client/backlog-api-client.js';
import { ConfigManager } from '../config/config-manager.js';
import type { Category, Priority, Resolution, Status } from '../types/index.js';
import type { ToolRegistry } from './tool-registry.js';

/**
 * マスタデータ関連ツールを登録します
 */
export function registerMasterDataTools(
  toolRegistry: ToolRegistry,
  apiClient: BacklogApiClient,
): void {
  // 優先度一覧取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_priorities',
      description: '優先度一覧を取得します（読み取り専用）',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    async () => {
      try {
        const priorities = await apiClient.get<Priority[]>('/priorities');

        return {
          success: true,
          data: priorities,
          count: priorities.length,
          message: `${priorities.length}件の優先度を取得しました`,
        };
      } catch (error) {
        throw new Error(
          `優先度一覧の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );

  // ステータス一覧取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_statuses',
      description:
        'ステータス一覧を取得します（読み取り専用）。プロジェクトIDまたはキーを省略した場合、デフォルトプロジェクトを使用します。',
      inputSchema: {
        type: 'object',
        properties: {
          projectIdOrKey: {
            type: 'string',
            description:
              'プロジェクトIDまたはプロジェクトキー（例: "MYPROJ" または "123"）。省略時はデフォルトプロジェクトを使用。',
          },
        },
        required: [],
      },
    },
    async (args) => {
      const { projectIdOrKey } = args as { projectIdOrKey?: string };
      const configManager = ConfigManager.getInstance();

      try {
        const resolvedProjectIdOrKey =
          configManager.resolveProjectIdOrKey(projectIdOrKey);

        const statuses = await apiClient.get<Status[]>(
          `/projects/${encodeURIComponent(resolvedProjectIdOrKey)}/statuses`,
        );

        const isDefaultProject =
          !projectIdOrKey && configManager.hasDefaultProject();

        return {
          success: true,
          data: statuses,
          count: statuses.length,
          message: `${statuses.length}件のステータスを取得しました${isDefaultProject ? '（デフォルトプロジェクト）' : ''}`,
          isDefaultProject,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('デフォルトプロジェクト')
        ) {
          throw error;
        }
        throw new Error(
          `ステータス一覧の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );

  // 完了理由一覧取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_resolutions',
      description:
        '完了理由一覧を取得します（読み取り専用）。プロジェクトIDまたはキーを省略した場合、デフォルトプロジェクトを使用します。',
      inputSchema: {
        type: 'object',
        properties: {
          projectIdOrKey: {
            type: 'string',
            description:
              'プロジェクトIDまたはプロジェクトキー（例: "MYPROJ" または "123"）。省略時はデフォルトプロジェクトを使用。',
          },
        },
        required: [],
      },
    },
    async (args) => {
      const { projectIdOrKey } = args as { projectIdOrKey?: string };
      const configManager = ConfigManager.getInstance();

      try {
        const resolvedProjectIdOrKey =
          configManager.resolveProjectIdOrKey(projectIdOrKey);

        const resolutions = await apiClient.get<Resolution[]>(
          `/projects/${encodeURIComponent(resolvedProjectIdOrKey)}/resolutions`,
        );

        const isDefaultProject =
          !projectIdOrKey && configManager.hasDefaultProject();

        return {
          success: true,
          data: resolutions,
          count: resolutions.length,
          message: `${resolutions.length}件の完了理由を取得しました${isDefaultProject ? '（デフォルトプロジェクト）' : ''}`,
          isDefaultProject,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('デフォルトプロジェクト')
        ) {
          throw error;
        }
        throw new Error(
          `完了理由一覧の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );

  // カテゴリ一覧取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_categories',
      description:
        'カテゴリ一覧を取得します（読み取り専用）。プロジェクトIDまたはキーを省略した場合、デフォルトプロジェクトを使用します。',
      inputSchema: {
        type: 'object',
        properties: {
          projectIdOrKey: {
            type: 'string',
            description:
              'プロジェクトIDまたはプロジェクトキー（例: "MYPROJ" または "123"）。省略時はデフォルトプロジェクトを使用。',
          },
        },
        required: [],
      },
    },
    async (args) => {
      const { projectIdOrKey } = args as { projectIdOrKey?: string };
      const configManager = ConfigManager.getInstance();

      try {
        const resolvedProjectIdOrKey =
          configManager.resolveProjectIdOrKey(projectIdOrKey);

        const categories = await apiClient.get<Category[]>(
          `/projects/${encodeURIComponent(resolvedProjectIdOrKey)}/categories`,
        );

        const isDefaultProject =
          !projectIdOrKey && configManager.hasDefaultProject();

        return {
          success: true,
          data: categories,
          count: categories.length,
          message: `${categories.length}件のカテゴリを取得しました${isDefaultProject ? '（デフォルトプロジェクト）' : ''}`,
          isDefaultProject,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('デフォルトプロジェクト')
        ) {
          throw error;
        }
        throw new Error(
          `カテゴリ一覧の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );
}
