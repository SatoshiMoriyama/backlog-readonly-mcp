/**
 * プロジェクト関連ツール
 *
 * Backlogのプロジェクト情報を取得するためのツールを提供します。
 */

import type { BacklogApiClient } from '../client/backlog-api-client.js';
import { ConfigManager } from '../config/config-manager.js';
import type { BacklogProject, BacklogUser } from '../types/index.js';
import type { ToolRegistry } from './tool-registry.js';

/**
 * プロジェクト関連ツールを登録します
 */
export function registerProjectTools(
  toolRegistry: ToolRegistry,
  apiClient: BacklogApiClient,
): void {
  // プロジェクト一覧取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_projects',
      description: 'プロジェクト一覧を取得します（読み取り専用）',
      inputSchema: {
        type: 'object',
        properties: {
          archived: {
            type: 'boolean',
            description:
              'アーカイブされたプロジェクトも含めるかどうか（デフォルト: false）',
          },
          all: {
            type: 'boolean',
            description:
              'すべてのプロジェクトを取得するかどうか（デフォルト: false）',
          },
        },
        required: [],
      },
    },
    async (args) => {
      const { archived = false, all = false } = args as {
        archived?: boolean;
        all?: boolean;
      };

      const params: Record<string, unknown> = {};
      if (archived) {
        params.archived = archived;
      }
      if (all) {
        params.all = all;
      }

      const projects = await apiClient.get<BacklogProject[]>(
        '/projects',
        params,
      );

      // ホワイトリストでフィルタリング（要件3）
      const configManager = ConfigManager.getInstance();
      const whitelistManager = configManager.getWhitelistManager();
      const filteredProjects = whitelistManager
        ? whitelistManager.filterProjects(projects)
        : projects;

      return {
        success: true,
        data: filteredProjects,
        count: filteredProjects.length,
        message: `${filteredProjects.length}件のプロジェクトを取得しました`,
        isFiltered: whitelistManager?.isWhitelistEnabled() || false,
        originalCount: projects.length,
      };
    },
  );

  // プロジェクト詳細取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_project',
      description:
        'プロジェクトの詳細情報を取得します（読み取り専用）。プロジェクトIDまたはキーを省略した場合、デフォルトプロジェクトを使用します。',
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

        // プロジェクト情報を取得
        const project = await apiClient.get<BacklogProject>(
          `/projects/${encodeURIComponent(resolvedProjectIdOrKey)}`,
        );

        // ホワイトリスト検証（要件4）- プロジェクトキーとIDの両方で検証
        const whitelistManager = configManager.getWhitelistManager();
        if (whitelistManager?.isWhitelistEnabled()) {
          const isAllowed = whitelistManager.validateProjectAccess(
            project.projectKey,
            String(project.id),
          );
          if (!isAllowed) {
            throw new Error(
              whitelistManager.createAccessDeniedMessage(
                `${project.projectKey} (ID: ${project.id})`,
              ),
            );
          }
        }

        const isDefaultProject =
          !projectIdOrKey && configManager.hasDefaultProject();

        return {
          success: true,
          data: project,
          message: `プロジェクト "${project.name}" の詳細情報を取得しました${isDefaultProject ? '（デフォルトプロジェクト）' : ''}`,
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
          `プロジェクトの取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );

  // プロジェクトメンバー取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_project_users',
      description:
        'プロジェクトのメンバー一覧を取得します（読み取り専用）。プロジェクトIDまたはキーを省略した場合、デフォルトプロジェクトを使用します。',
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

        // ホワイトリスト検証 - プロジェクト情報を取得して両方で検証
        const whitelistManager = configManager.getWhitelistManager();
        if (whitelistManager?.isWhitelistEnabled()) {
          // プロジェクト情報を取得してキーとIDを両方取得
          const project = await apiClient.get<{
            id: number;
            projectKey: string;
          }>(`/projects/${encodeURIComponent(resolvedProjectIdOrKey)}`);

          const isAllowed = whitelistManager.validateProjectAccess(
            project.projectKey,
            String(project.id),
          );
          if (!isAllowed) {
            throw new Error(
              whitelistManager.createAccessDeniedMessage(
                `${project.projectKey} (ID: ${project.id})`,
              ),
            );
          }
        }

        const users = await apiClient.get<BacklogUser[]>(
          `/projects/${encodeURIComponent(resolvedProjectIdOrKey)}/users`,
        );

        const isDefaultProject =
          !projectIdOrKey && configManager.hasDefaultProject();

        return {
          success: true,
          data: users,
          count: users.length,
          message: `プロジェクトのメンバー ${users.length}名を取得しました${isDefaultProject ? '（デフォルトプロジェクト）' : ''}`,
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
          `プロジェクトメンバーの取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );

  // デフォルトプロジェクト情報取得ツール
  toolRegistry.registerTool(
    {
      name: 'get_default_project',
      description: 'デフォルトプロジェクトの情報を取得します（読み取り専用）',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    async () => {
      const configInfo = apiClient.getConfigInfo();

      if (!configInfo.defaultProject) {
        return {
          success: false,
          message: 'デフォルトプロジェクトが設定されていません',
          data: null,
        };
      }

      try {
        const project = await apiClient.get<BacklogProject>(
          `/projects/${encodeURIComponent(configInfo.defaultProject)}`,
        );

        return {
          success: true,
          data: project,
          message: `デフォルトプロジェクト "${project.name}" の情報を取得しました`,
          defaultProjectKey: configInfo.defaultProject,
        };
      } catch (error) {
        return {
          success: false,
          message: `デフォルトプロジェクト "${configInfo.defaultProject}" の取得に失敗しました`,
          error: error instanceof Error ? error.message : '不明なエラー',
          defaultProjectKey: configInfo.defaultProject,
        };
      }
    },
  );
}
