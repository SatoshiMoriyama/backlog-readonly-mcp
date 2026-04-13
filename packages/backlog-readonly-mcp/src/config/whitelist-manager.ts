/**
 * プロジェクトホワイトリスト管理クラス
 *
 * プロジェクトIDまたはキーがホワイトリストに含まれているか検証し、
 * プロジェクト一覧のフィルタリングを行います。
 */

import type { BacklogProject } from '../types/index.js';
import * as logger from '../utils/logger.js';

export class WhitelistManager {
  private whitelist: Set<string> | null;
  private isEnabled: boolean;

  /**
   * WhitelistManagerを初期化
   * @param whitelistConfig ホワイトリスト設定（プロジェクトIDまたはキーの配列）
   */
  constructor(whitelistConfig?: string[]) {
    if (whitelistConfig && whitelistConfig.length > 0) {
      this.whitelist = new Set(whitelistConfig);
      this.isEnabled = true;
      logger.info(
        `プロジェクトホワイトリストが有効化されました: ${whitelistConfig.length}件`,
      );
    } else {
      this.whitelist = null;
      this.isEnabled = false;
      logger.info('プロジェクトホワイトリストは無効です');
    }
  }

  /**
   * ホワイトリストが有効かどうか
   * 要件1.5: ホワイトリスト未設定時は機能を無効化
   */
  public isWhitelistEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * プロジェクトIDまたはキーがホワイトリストに含まれているか検証
   * プロジェクトキー（文字列）とプロジェクトID（数値文字列）の両方をサポート
   * 要件2.5: プロジェクトキーとプロジェクトIDの両方の形式で検証
   *
   * @param projectIdOrKey プロジェクトIDまたはキー
   * @param alternativeIdOrKey 代替のプロジェクトIDまたはキー（オプション）
   * @returns アクセスが許可される場合はtrue、拒否される場合はfalse
   */
  public validateProjectAccess(
    projectIdOrKey: string,
    alternativeIdOrKey?: string,
  ): boolean {
    // 要件2.4: ホワイトリスト無効時はすべて許可
    if (!this.isEnabled || !this.whitelist) {
      return true;
    }

    // 第1引数または第2引数のどちらかがホワイトリストに含まれていればOK
    const isAllowed =
      this.whitelist.has(projectIdOrKey) ||
      (alternativeIdOrKey ? this.whitelist.has(alternativeIdOrKey) : false);

    if (isAllowed) {
      // 要件8.3: 許可されたプロジェクトIDをデバッグログ出力
      logger.debug(`プロジェクトアクセス許可: ${projectIdOrKey}`);
    } else {
      // 要件8.2: 拒否されたプロジェクトIDをログ出力
      logger.warn(
        `プロジェクトアクセス拒否: ${projectIdOrKey}${alternativeIdOrKey ? ` (代替: ${alternativeIdOrKey})` : ''}`,
      );
    }

    return isAllowed;
  }

  /**
   * プロジェクト一覧をホワイトリストでフィルタリング
   * 要件3.2: プロジェクトIDとプロジェクトキーの両方でマッチング
   *
   * @param projects プロジェクト一覧
   * @returns フィルタリング後のプロジェクト一覧
   */
  public filterProjects(projects: BacklogProject[]): BacklogProject[] {
    // 要件3.4: ホワイトリスト無効時はすべて返す
    if (!this.isEnabled || !this.whitelist) {
      return projects;
    }

    const filtered = projects.filter((project) => {
      // プロジェクトキーとプロジェクトIDの両方でマッチング
      return (
        this.whitelist?.has(project.projectKey) ||
        this.whitelist?.has(String(project.id))
      );
    });

    // 要件3.3: フィルタリング後の件数を返す
    logger.info(
      `プロジェクト一覧をフィルタリング: ${projects.length}件 → ${filtered.length}件`,
    );

    return filtered;
  }

  /**
   * アクセス拒否エラーメッセージを生成
   * 要件7: ユーザーフレンドリーなエラーメッセージ
   *
   * @param projectIdOrKey 拒否されたプロジェクトIDまたはキー
   * @returns エラーメッセージ
   */
  public createAccessDeniedMessage(projectIdOrKey: string): string {
    // 要件7.2: 拒否されたプロジェクトIDを含める
    // 要件7.3: ホワイトリストに含まれていないという説明を含める
    // 要件7.4: 設定方法のヒントを含める
    return (
      `プロジェクト "${projectIdOrKey}" へのアクセスは許可されていません。` +
      `このプロジェクトはホワイトリストに含まれていません。` +
      `\n\nアクセスを許可するには、環境変数 BACKLOG_PROJECT_WHITELIST に` +
      `プロジェクトIDまたはキーを追加してください。` +
      `\n例: BACKLOG_PROJECT_WHITELIST="PROJ1,PROJ2,12345"`
    );
  }

  /**
   * ホワイトリストの内容を取得（デバッグ用）
   * @returns ホワイトリストの配列、または無効時はnull
   */
  public getWhitelistContent(): string[] | null {
    if (!this.isEnabled || !this.whitelist) {
      return null;
    }
    return Array.from(this.whitelist);
  }
}
