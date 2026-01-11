/**
 * Wiki関連ツール
 *
 * BacklogのWiki情報を取得するためのツールを提供します。
 */

import type { BacklogApiClient } from '../client/backlog-api-client.js';
import { ConfigManager } from '../config/config-manager.js';
import type { BacklogWiki } from '../types/index.js';
import type { ToolRegistry } from './tool-registry.js';

/**
 * Wiki関連ツールを登録します
 */
export function registerWikiTools(
  toolRegistry: ToolRegistry,
  apiClient: BacklogApiClient,
): void {
  // Wiki一覧取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_wikis',
      description:
        'Wiki一覧を取得します（読み取り専用）。プロジェクトIDまたはキーを省略した場合、デフォルトプロジェクトを使用します。',
      inputSchema: {
        type: 'object',
        properties: {
          projectIdOrKey: {
            type: 'string',
            description:
              'プロジェクトIDまたはプロジェクトキー（例: "MYPROJ" または "123"）。省略時はデフォルトプロジェクトを使用。',
          },
          keyword: {
            type: 'string',
            description: 'キーワード検索（Wiki名と内容を対象）',
          },
        },
        required: [],
      },
    },
    async (args) => {
      const { projectIdOrKey, keyword } = args as {
        projectIdOrKey?: string;
        keyword?: string;
      };
      const configManager = ConfigManager.getInstance();

      try {
        const resolvedProjectIdOrKey =
          configManager.resolveProjectIdOrKey(projectIdOrKey);

        const params: Record<string, unknown> = {};
        if (keyword) {
          params.keyword = keyword;
        }

        const wikis = await apiClient.get<BacklogWiki[]>(
          `/projects/${encodeURIComponent(resolvedProjectIdOrKey)}/wikis`,
          params,
        );

        const isDefaultProject =
          !projectIdOrKey && configManager.hasDefaultProject();

        return {
          success: true,
          data: wikis,
          count: wikis.length,
          message: `${wikis.length}件のWikiページを取得しました${isDefaultProject ? '（デフォルトプロジェクト）' : ''}`,
          isDefaultProject,
          searchParams: params,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('デフォルトプロジェクト')
        ) {
          throw error;
        }
        throw new Error(
          `Wiki一覧の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );

  // 特定Wiki取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_wiki',
      description: '特定のWikiページを取得します（読み取り専用）',
      inputSchema: {
        type: 'object',
        properties: {
          wikiId: {
            type: 'string',
            description: 'WikiのID（数値）',
          },
        },
        required: ['wikiId'],
      },
    },
    async (args) => {
      const { wikiId } = args as { wikiId: string };

      try {
        const wiki = await apiClient.get<BacklogWiki>(
          `/wikis/${encodeURIComponent(wikiId)}`,
        );

        return {
          success: true,
          data: wiki,
          message: `Wikiページ "${wiki.name}" を取得しました`,
        };
      } catch (error) {
        throw new Error(
          `Wikiページの取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );
}
