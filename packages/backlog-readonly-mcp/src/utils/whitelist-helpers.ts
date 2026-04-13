/**
 * ホワイトリスト検証ヘルパー
 *
 * 複数のツールで共通するプロジェクトホワイトリスト検証ロジックを提供します。
 */

import type { BacklogApiClient } from '../client/backlog-api-client.js';
import type { ConfigManager } from '../config/config-manager.js';

/** プロジェクト情報の簡易型 */
type ProjectInfo = { id: number; projectKey: string };

/**
 * プロジェクト情報のインメモリキャッシュ（TTL: 60秒）
 * MCPサーバーはシングルプロセスで動作するためモジュールスコープのキャッシュが有効に機能する。
 * 同一プロジェクトへの連続ツール呼び出し時に /projects/{id} の余分なAPI呼び出しを削減する。
 */
const projectCache = new Map<
  string,
  { data: ProjectInfo; expiresAt: number }
>();
const CACHE_TTL_MS = 60_000;

/**
 * プロジェクトのホワイトリスト検証を行い、拒否された場合は例外をスローする。
 * ホワイトリストが無効な場合は何もしない。
 *
 * プロジェクト情報をAPIから取得してキーとIDの両方で検証するため、
 * projectIdOrKey には数値IDでも文字列キーでも渡せる。
 * APIレスポンスは認証済みBacklogテナントからのものであり信頼できると見なす。
 *
 * @param apiClient Backlog APIクライアント
 * @param configManager 設定マネージャー
 * @param projectIdOrKey プロジェクトIDまたはキー
 */
export async function assertProjectWhitelistAllowed(
  apiClient: BacklogApiClient,
  configManager: ConfigManager,
  projectIdOrKey: string | number,
): Promise<void> {
  const whitelistManager = configManager.getWhitelistManager();
  if (!whitelistManager?.isWhitelistEnabled()) {
    return;
  }

  const cacheKey = String(projectIdOrKey);
  const cached = projectCache.get(cacheKey);
  let project: ProjectInfo;

  if (cached && cached.expiresAt > Date.now()) {
    project = cached.data;
  } else {
    project = await apiClient.get<ProjectInfo>(
      `/projects/${encodeURIComponent(cacheKey)}`,
    );
    projectCache.set(cacheKey, {
      data: project,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

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
