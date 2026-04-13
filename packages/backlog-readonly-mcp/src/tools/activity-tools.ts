/**
 * アクティビティ関連ツール
 *
 * Backlogのアクティビティ情報を取得するためのツールを提供します。
 * スペース全体・プロジェクト単位・ユーザー単位の3種類に対応しています。
 */

import type { BacklogApiClient } from '../client/backlog-api-client.js';
import { ConfigManager } from '../config/config-manager.js';
import type { BacklogActivity } from '../types/index.js';
import * as logger from '../utils/logger.js';
import type { ToolRegistry } from './tool-registry.js';

/**
 * アクティビティ系ツールで共通するクエリパラメータのinputSchema定義
 */
const COMMON_ACTIVITY_PROPERTIES = {
  activityTypeId: {
    type: 'array' as const,
    items: { type: 'number' as const },
    description:
      'アクティビティ種別IDでフィルタ（複数指定可）。1:課題追加 2:課題更新 3:課題コメント 4:課題削除 5:Wiki追加 6:Wiki更新 7:Wiki削除 8:共有ファイル追加 9:共有ファイル更新 10:共有ファイル削除 11:SVNコミット 12:Gitプッシュ 13:Gitリポジトリ作成 14:課題一括更新 15:ユーザー参加 16:ユーザー脱退 17:お知らせ追加 18:PR追加 19:PR更新 20:PRコメント 21:PR削除 22:マイルストーン追加 23:マイルストーン更新 24:マイルストーン削除 25:グループ参加 26:グループ脱退',
  },
  minId: {
    type: 'number' as const,
    description: 'この値以上のIDのアクティビティを取得（ページネーション用）',
  },
  maxId: {
    type: 'number' as const,
    description: 'この値以下のIDのアクティビティを取得（ページネーション用）',
  },
  count: {
    type: 'number' as const,
    description: '取得件数（デフォルト: 20, 最大: 100）',
  },
  order: {
    type: 'string' as const,
    enum: ['asc', 'desc'],
    description: 'ソート順（asc: 昇順, desc: 降順、デフォルト: desc）',
  },
  since: {
    type: 'string' as const,
    description:
      '取得開始日時（YYYY-MM-DD または YYYY-MM-DDTHH:mm:ss形式）。取得後にクライアント側でフィルタリングします。',
  },
  until: {
    type: 'string' as const,
    description:
      '取得終了日時（YYYY-MM-DD または YYYY-MM-DDTHH:mm:ss形式）。YYYY-MM-DD のみの場合は当日末尾まで含みます。取得後にクライアント側でフィルタリングします。',
  },
};

type CommonActivityArgs = {
  activityTypeId?: number[];
  minId?: number;
  maxId?: number;
  count?: number;
  order?: 'asc' | 'desc';
  since?: string;
  until?: string;
};

/**
 * クエリパラメータを構築するヘルパー
 */
function buildActivityParams(
  args: CommonActivityArgs,
): Record<string, unknown> {
  const { activityTypeId, minId, maxId, count = 20, order = 'desc' } = args;
  const params: Record<string, unknown> = {
    count: Math.min(count, 100),
    order,
  };
  if (activityTypeId?.length) params['activityTypeId[]'] = activityTypeId;
  if (minId !== undefined) params.minId = minId;
  if (maxId !== undefined) params.maxId = maxId;
  return params;
}

/**
 * UTC日時文字列をJST（+09:00）の文字列に変換する
 * 例: "2026-04-13T10:39:46Z" → "2026-04-13T19:39:46+09:00"
 */
function toJSTString(utcString: string): string {
  const d = new Date(utcString);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}T${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:${pad(jst.getUTCSeconds())}+09:00`;
}

/**
 * アクティビティ配列の created フィールドをJSTに変換する
 */
function convertActivitiesToJST(
  activities: BacklogActivity[],
): BacklogActivity[] {
  return activities.map((a) => ({
    ...a,
    created: toJSTString(a.created),
  }));
}

/**
 * 日付文字列をJST（UTC+9）として解釈してDateオブジェクトを返す
 * タイムゾーン指定済み（末尾Z や +09:00 など）の場合はそのまま解釈する
 */
function parseDateAsJST(dateStr: string): Date {
  // タイムゾーン情報がすでに含まれている場合はそのまま解釈
  if (dateStr.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  // タイムゾーンなし → JST（+09:00）として解釈
  const normalized =
    dateStr.length === 10
      ? `${dateStr}T00:00:00+09:00` // YYYY-MM-DD → JSTの0時
      : `${dateStr}+09:00`; // YYYY-MM-DDTHH:mm:ss → JST
  return new Date(normalized);
}

/**
 * since/until による日付フィルタリングを適用するヘルパー
 * since/until はJST基準で解釈します
 */
function filterByDate(
  activities: BacklogActivity[],
  since?: string,
  until?: string,
): BacklogActivity[] {
  if (!since && !until) return activities;

  const sinceMs = since ? parseDateAsJST(since).getTime() : undefined;
  let untilMs: number | undefined;
  if (until) {
    const d = parseDateAsJST(until);
    // YYYY-MM-DD のみ指定の場合は当日JST 23:59:59.999まで含める
    // parseDateAsJSTでJST 0時に変換済みなので、+24h-1ms でJST末尾になる
    if (until.length === 10) {
      d.setTime(d.getTime() + 86399999);
    }
    untilMs = d.getTime();
  }

  return activities.filter((a) => {
    const createdMs = new Date(a.created).getTime();
    if (sinceMs !== undefined && createdMs < sinceMs) return false;
    if (untilMs !== undefined && createdMs > untilMs) return false;
    return true;
  });
}

/**
 * ホワイトリストでアクティビティをフィルタリングするヘルパー
 * スペース全体・ユーザー単位など、複数プロジェクトにまたがる結果に使用する
 */
function filterActivitiesByWhitelist(
  activities: BacklogActivity[],
  whitelistManager: NonNullable<
    ReturnType<ConfigManager['getWhitelistManager']>
  >,
): { filtered: BacklogActivity[]; originalCount: number } {
  const originalCount = activities.length;
  const filtered = activities.filter((a) =>
    whitelistManager.validateProjectAccess(
      String(a.project.id),
      a.project.projectKey,
    ),
  );
  return { filtered, originalCount };
}

/**
 * アクティビティ関連ツールを登録します
 */
export function registerActivityTools(
  toolRegistry: ToolRegistry,
  apiClient: BacklogApiClient,
): void {
  // ----------------------------------------------------------------
  // スペース全体のアクティビティ取得ツール
  // ----------------------------------------------------------------
  toolRegistry.registerTool(
    {
      name: 'get_space_activities',
      description:
        'スペース全体（全プロジェクト横断）の最近のアクティビティを取得します（読み取り専用）。since/until で日付絞り込みも可能です。ホワイトリストが有効な場合は許可プロジェクトのアクティビティのみ返します。',
      inputSchema: {
        type: 'object',
        properties: COMMON_ACTIVITY_PROPERTIES,
        required: [],
      },
    },
    async (args) => {
      const { since, until, ...rest } = args as CommonActivityArgs;
      const configManager = ConfigManager.getInstance();

      try {
        const params = buildActivityParams(rest);
        let activities = await apiClient.get<BacklogActivity[]>(
          '/space/activities',
          params,
        );

        // ホワイトリストフィルタリング
        const whitelistManager = configManager.getWhitelistManager();
        if (whitelistManager?.isWhitelistEnabled()) {
          const { filtered, originalCount } = filterActivitiesByWhitelist(
            activities,
            whitelistManager,
          );
          if (originalCount > filtered.length) {
            logger.info(
              `スペースアクティビティをホワイトリストでフィルタリング: ${originalCount}件 → ${filtered.length}件`,
            );
          }
          activities = filtered;
        }

        // 日付フィルタリング
        const filtered = convertActivitiesToJST(
          filterByDate(activities, since, until),
        );

        return {
          success: true,
          data: filtered,
          count: filtered.length,
          message: `スペース全体のアクティビティ ${filtered.length}件を取得しました`,
          searchParams: { ...params, since, until },
        };
      } catch (error) {
        throw new Error(
          `スペースアクティビティの取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );

  // ----------------------------------------------------------------
  // プロジェクト単位のアクティビティ取得ツール
  // ----------------------------------------------------------------
  toolRegistry.registerTool(
    {
      name: 'get_project_activities',
      description:
        '特定プロジェクトの最近のアクティビティを取得します（読み取り専用）。projectIdOrKey を省略するとデフォルトプロジェクトを使用します。since/until で日付絞り込みも可能です。',
      inputSchema: {
        type: 'object',
        properties: {
          projectIdOrKey: {
            type: 'string',
            description:
              'プロジェクトIDまたはプロジェクトキー（例: "MYPROJ" または "12345"）。省略時はデフォルトプロジェクトを使用。',
          },
          ...COMMON_ACTIVITY_PROPERTIES,
        },
        required: [],
      },
    },
    async (args) => {
      const { projectIdOrKey, since, until, ...rest } = args as {
        projectIdOrKey?: string;
      } & CommonActivityArgs;

      const configManager = ConfigManager.getInstance();

      try {
        // プロジェクトIDの解決（デフォルトプロジェクト対応）
        let resolvedProjectId: string | undefined;
        if (projectIdOrKey) {
          resolvedProjectId = projectIdOrKey;
        } else if (configManager.hasDefaultProject()) {
          resolvedProjectId = configManager.getDefaultProject() ?? undefined;
        }

        if (!resolvedProjectId) {
          throw new Error(
            'projectIdOrKey が指定されておらず、デフォルトプロジェクトも設定されていません。',
          );
        }

        // ホワイトリスト検証
        // 注: assertProjectWhitelistAllowed ではなくインライン実装を使用している。
        // アクティビティ取得はプロジェクトが存在しない場合でも試みたいケースがあるため、
        // /projects/{id} の取得失敗時はキー不明のままIDのみで検証を続行するソフトフォールバック設計。
        // assertProjectWhitelistAllowed はAPI失敗時に例外をそのまま伝播させるため使用していない。
        const whitelistManager = configManager.getWhitelistManager();
        if (whitelistManager?.isWhitelistEnabled()) {
          let validatedProjectId = resolvedProjectId;
          let projectKey: string | undefined;

          try {
            const project = await apiClient.get<{
              id: number;
              projectKey: string;
            }>(`/projects/${encodeURIComponent(resolvedProjectId)}`);
            validatedProjectId = String(project.id);
            projectKey = project.projectKey;
          } catch (_error) {
            // プロジェクト取得失敗時はIDのみで検証を続行
            projectKey = undefined;
          }

          const isAllowed = whitelistManager.validateProjectAccess(
            validatedProjectId,
            projectKey,
          );
          if (!isAllowed) {
            throw new Error(
              whitelistManager.createAccessDeniedMessage(
                projectKey
                  ? `${projectKey} (ID: ${validatedProjectId})`
                  : validatedProjectId,
              ),
            );
          }
        }

        const params = buildActivityParams(rest);
        const activities = await apiClient.get<BacklogActivity[]>(
          `/projects/${encodeURIComponent(resolvedProjectId)}/activities`,
          params,
        );

        // 日付フィルタリング
        const filtered = convertActivitiesToJST(
          filterByDate(activities, since, until),
        );

        const isDefaultProject =
          !projectIdOrKey && configManager.hasDefaultProject();

        logger.info(
          `プロジェクト "${resolvedProjectId}" のアクティビティを取得: ${filtered.length}件`,
        );

        return {
          success: true,
          data: filtered,
          count: filtered.length,
          message: `プロジェクト "${resolvedProjectId}" のアクティビティ ${filtered.length}件を取得しました${isDefaultProject ? '（デフォルトプロジェクト）' : ''}`,
          isDefaultProject,
          searchParams: { ...params, since, until },
        };
      } catch (error) {
        throw new Error(
          `プロジェクトアクティビティの取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );

  // ----------------------------------------------------------------
  // ユーザー単位のアクティビティ取得ツール
  // ----------------------------------------------------------------
  toolRegistry.registerTool(
    {
      name: 'get_user_activities',
      description:
        '特定ユーザーの最近のアクティビティを取得します（読み取り専用）。since/until で日付絞り込みも可能です。ホワイトリストが有効な場合は許可プロジェクトのアクティビティのみ返します。',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'number',
            description: 'ユーザーID（数値）',
          },
          ...COMMON_ACTIVITY_PROPERTIES,
        },
        required: ['userId'],
      },
    },
    async (args) => {
      const { userId, since, until, ...rest } = args as {
        userId: number;
      } & CommonActivityArgs;

      const configManager = ConfigManager.getInstance();

      try {
        const params = buildActivityParams(rest);
        let activities = await apiClient.get<BacklogActivity[]>(
          `/users/${userId}/activities`,
          params,
        );

        // ホワイトリストフィルタリング
        const whitelistManager = configManager.getWhitelistManager();
        if (whitelistManager?.isWhitelistEnabled()) {
          const { filtered: whitelisted, originalCount } =
            filterActivitiesByWhitelist(activities, whitelistManager);
          if (originalCount > whitelisted.length) {
            logger.info(
              `ユーザーアクティビティをホワイトリストでフィルタリング: ${originalCount}件 → ${whitelisted.length}件`,
            );
          }
          activities = whitelisted;
        }

        // 日付フィルタリング
        const filtered = convertActivitiesToJST(
          filterByDate(activities, since, until),
        );

        return {
          success: true,
          data: filtered,
          count: filtered.length,
          message: `ユーザー ID:${userId} のアクティビティ ${filtered.length}件を取得しました`,
          searchParams: { ...params, since, until },
        };
      } catch (error) {
        throw new Error(
          `ユーザーアクティビティの取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
  );
}
