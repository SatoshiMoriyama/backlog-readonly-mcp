/**
 * 設定管理クラス
 *
 * 環境変数と.backlog-mcp.envファイルから設定を読み込み、
 * 優先順位に従って設定を管理します。
 */

import { existsSync, readFileSync } from 'node:fs';
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

    // システム環境変数を保存
    const systemEnv = {
      BACKLOG_DOMAIN: process.env.BACKLOG_DOMAIN,
      BACKLOG_API_KEY: process.env.BACKLOG_API_KEY,
      BACKLOG_DEFAULT_PROJECT: process.env.BACKLOG_DEFAULT_PROJECT,
      BACKLOG_MAX_RETRIES: process.env.BACKLOG_MAX_RETRIES,
      BACKLOG_TIMEOUT: process.env.BACKLOG_TIMEOUT,
    };

    // ワークスペース設定ファイルから設定を読み込み
    const workspaceConfig: Record<string, string | undefined> = {};

    // BACKLOG_CONFIG_PATH環境変数で指定されたファイル、なければデフォルトの .backlog-mcp.env を読み込み
    const envConfigPath = process.env.BACKLOG_CONFIG_PATH;
    const configPath =
      envConfigPath && envConfigPath.trim().length > 0
        ? envConfigPath
        : '.backlog-mcp.env';

    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith('#')) {
            const [key, ...valueParts] = trimmedLine.split('=');
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=').trim();
              // クォートを除去
              const cleanValue = value.replace(/^["']|["']$/g, '');
              workspaceConfig[key.trim()] = cleanValue;
            }
          }
        }
      } catch (error) {
        console.warn(
          `ワークスペース設定ファイルの読み込みに失敗しました: ${error}`,
        );
      }
    }

    // 設定の優先順位処理：ワークスペース設定 > システム環境変数
    const domain = workspaceConfig.BACKLOG_DOMAIN || systemEnv.BACKLOG_DOMAIN;
    const apiKey = workspaceConfig.BACKLOG_API_KEY || systemEnv.BACKLOG_API_KEY;
    const defaultProject =
      workspaceConfig.BACKLOG_DEFAULT_PROJECT ||
      systemEnv.BACKLOG_DEFAULT_PROJECT;
    const maxRetries =
      workspaceConfig.BACKLOG_MAX_RETRIES ||
      systemEnv.BACKLOG_MAX_RETRIES ||
      '3';
    const timeout =
      workspaceConfig.BACKLOG_TIMEOUT || systemEnv.BACKLOG_TIMEOUT || '30000';

    if (!domain || !apiKey) {
      throw new Error(
        'BACKLOG_DOMAIN と BACKLOG_API_KEY が設定されていません。' +
          '環境変数または .backlog-mcp.env ファイルで設定してください。',
      );
    }

    this._config = {
      domain: domain,
      apiKey: apiKey,
      defaultProject: defaultProject,
      maxRetries: parseInt(maxRetries, 10),
      timeout: parseInt(timeout, 10),
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

  /**
   * デフォルトプロジェクトが設定されているかチェック
   */
  public hasDefaultProject(): boolean {
    const config = this.getConfig();
    return !!config.defaultProject;
  }

  /**
   * デフォルトプロジェクトキーを取得
   */
  public getDefaultProject(): string | undefined {
    const config = this.getConfig();
    return config.defaultProject;
  }

  /**
   * プロジェクトIDまたはキーを解決（デフォルトプロジェクト機能付き）
   */
  public resolveProjectIdOrKey(projectIdOrKey?: string): string {
    if (projectIdOrKey) {
      return projectIdOrKey;
    }

    const defaultProject = this.getDefaultProject();
    if (!defaultProject) {
      throw new Error(
        'プロジェクトIDまたはキーが指定されておらず、デフォルトプロジェクトも設定されていません。',
      );
    }

    return defaultProject;
  }
}
