/**
 * Wiki関連ツール
 *
 * BacklogのWiki情報を取得するためのツールを提供します。
 */

import type { BacklogApiClient } from '../client/backlog-api-client.js';
import type { BacklogWiki } from '../types/index.js';
import type { ToolRegistry } from './tool-registry.js';

/**
 * Wiki関連ツールを登録します
 */
export function registerWikiTools(
  toolRegistry: ToolRegistry,
  apiClient: BacklogApiClient,
): void {
  // 最近閲覧したWiki一覧取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_recent_wikis',
      description:
        '最近閲覧したWiki一覧を取得します（読み取り専用）。クライアントサイドでプロジェクトIDとキーワードによるフィルタリングを行います。',
      inputSchema: {
        type: 'object',
        properties: {
          projectIdOrKey: {
            type: 'string',
            description:
              'プロジェクトIDまたはプロジェクトキー（例: "MYPROJ" または "123"）。指定した場合、そのプロジェクトのWikiのみをフィルタリングします。',
          },
          keyword: {
            type: 'string',
            description:
              'キーワード検索（Wiki名と内容を対象）。クライアントサイドでフィルタリングを行います。',
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

      try {
        // 最近見たWiki一覧を取得
        const recentWikis = await apiClient.get<BacklogWiki[]>(
          '/users/myself/recentlyViewedWikis',
        );

        let filteredWikis = recentWikis;

        // プロジェクトIDまたはキーでフィルタリング
        if (projectIdOrKey) {
          // プロジェクトキーが指定された場合、プロジェクト一覧を取得してIDに変換
          let targetProjectId: number | null = null;

          // 数値の場合はプロジェクトIDとして扱う
          if (/^\d+$/.test(projectIdOrKey)) {
            targetProjectId = parseInt(projectIdOrKey, 10);
          } else {
            // プロジェクトキーの場合、プロジェクト一覧から対応するIDを検索
            try {
              const projects =
                await apiClient.get<Array<{ id: number; projectKey: string }>>(
                  '/projects',
                );
              const project = projects.find(
                (p) => p.projectKey === projectIdOrKey,
              );
              if (project) {
                targetProjectId = project.id;
              }
            } catch (projectError) {
              // プロジェクト一覧取得に失敗した場合はエラーを返す
              throw new Error(
                `プロジェクト一覧の取得に失敗しました。プロジェクトキー "${projectIdOrKey}" の確認ができません: ${projectError instanceof Error ? projectError.message : '不明なエラー'}`,
              );
            }
          }

          if (targetProjectId !== null) {
            filteredWikis = recentWikis.filter((wiki) => {
              return wiki.projectId === targetProjectId;
            });
          } else {
            // プロジェクトが見つからない場合は空の結果を返す
            filteredWikis = [];
          }
        }

        // キーワードでフィルタリング（Wiki名と内容を対象）
        if (keyword) {
          const lowerKeyword = keyword.toLowerCase();
          filteredWikis = filteredWikis.filter((wiki) => {
            const nameMatch =
              wiki.name?.toLowerCase().includes(lowerKeyword) ?? false;
            const contentMatch =
              wiki.content?.toLowerCase().includes(lowerKeyword) ?? false;
            return nameMatch || contentMatch;
          });
        }

        const projectFilter = projectIdOrKey
          ? ` (プロジェクト: ${projectIdOrKey})`
          : '';
        const keywordFilter = keyword ? ` (キーワード: ${keyword})` : '';
        const filterInfo = projectFilter + keywordFilter;

        return {
          success: true,
          data: filteredWikis,
          count: filteredWikis.length,
          totalRecentWikis: recentWikis.length,
          message: `${filteredWikis.length}件のWikiページを取得しました${filterInfo}（最近閲覧したWiki ${recentWikis.length}件から抽出）`,
          searchParams: { projectIdOrKey, keyword },
        };
      } catch (error) {
        throw new Error(
          `最近閲覧したWiki一覧の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
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
