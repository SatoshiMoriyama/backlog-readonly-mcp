/**
 * ユーザー関連ツール
 *
 * Backlogのユーザー情報を取得するためのツールを提供します。
 */

import type { BacklogApiClient } from '../client/backlog-api-client.js';
import type { BacklogUser } from '../types/index.js';
import type { ToolRegistry } from './tool-registry.js';

/**
 * ユーザー関連ツールを登録します
 */
export function registerUserTools(
  toolRegistry: ToolRegistry,
  apiClient: BacklogApiClient,
): void {
  // ユーザー一覧取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_users',
      description: 'ユーザー一覧を取得します（読み取り専用）',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    async () => {
      try {
        const users = await apiClient.get<BacklogUser[]>('/users');

        return {
          success: true,
          data: users,
          count: users.length,
          message: `${users.length}名のユーザーを取得しました`,
        };
      } catch (error) {
        throw new Error(
          `ユーザー一覧の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );

  // ユーザー詳細取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_user',
      description: 'ユーザーの詳細情報を取得します（読み取り専用）',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ユーザーID（数値IDまたはユーザーキー）',
          },
        },
        required: ['userId'],
      },
    },
    async (args) => {
      const { userId } = args as { userId: string };

      try {
        const user = await apiClient.get<BacklogUser>(
          `/users/${encodeURIComponent(userId)}`,
        );

        return {
          success: true,
          data: user,
          message: `ユーザー "${user.name}" の詳細情報を取得しました`,
        };
      } catch (error) {
        throw new Error(
          `ユーザー詳細の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );

  // 自分のユーザー情報取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_myself',
      description: '自分のユーザー情報を取得します（読み取り専用）',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    async () => {
      try {
        const user = await apiClient.get<BacklogUser>('/users/myself');

        return {
          success: true,
          data: user,
          message: `自分のユーザー情報を取得しました: ${user.name}`,
        };
      } catch (error) {
        throw new Error(
          `自分のユーザー情報の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );
}
