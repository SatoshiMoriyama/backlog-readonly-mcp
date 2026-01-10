/**
 * 設定管理クラス
 *
 * 環境変数と.backlog-mcp.envファイルから設定を読み込み、
 * 優先順位に従って設定を管理します。
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';
import type { BacklogConfig } from '../types/index.js';

export class ConfigManager {
  private static instance: ConfigManager;
  private _config: BacklogConfig | null = null;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 設定を読み込み
   *
   * 優先順位:
   * 1. ワークスペース設定ファイル (.backlog-mcp.env)
   * 2. システム環境変数
   */
  public loadConfig(): BacklogConfig {
    if (this._config) {
      return this._config;
    }

    // ワークスペース設定ファイルの読み込み
    const workspaceConfigPath = join(process.cwd(), '.backlog-mcp.env');
    if (existsSync(workspaceConfigPath)) {
      config({ path: workspaceConfigPath });
    }

    // 環境変数から設定を取得
    const domain = process.env.BACKLOG_DOMAIN;
    const apiKey = process.env.BACKLOG_API_KEY;

    if (!domain || !apiKey) {
      throw new Error(
        'BACKLOG_DOMAIN と BACKLOG_API_KEY が設定されていません。' +
          '環境変数または .backlog-mcp.env ファイルで設定してください。',
      );
    }

    this._config = {
      domain: domain,
      apiKey: apiKey,
      defaultProject: process.env.BACKLOG_DEFAULT_PROJECT,
      maxRetries: parseInt(process.env.BACKLOG_MAX_RETRIES || '3', 10),
      timeout: parseInt(process.env.BACKLOG_TIMEOUT || '30000', 10),
    };

    return this._config;
  }

  /**
   * 設定を取得
   */
  public getConfig(): BacklogConfig {
    if (!this._config) {
      return this.loadConfig();
    }
    return this._config;
  }

  /**
   * APIキーをマスキングして返す（ログ用）
   */
  public getMaskedApiKey(): string {
    const config = this.getConfig();
    const apiKey = config.apiKey;
    if (apiKey.length <= 8) {
      return '*'.repeat(apiKey.length);
    }
    return (
      apiKey.substring(0, 4) +
      '*'.repeat(apiKey.length - 8) +
      apiKey.substring(apiKey.length - 4)
    );
  }

  /**
   * 設定をリセット（テスト用）
   */
  public reset(): void {
    this._config = null;
  }
}
