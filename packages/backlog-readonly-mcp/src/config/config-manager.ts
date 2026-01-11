/**
 * 設定管理クラス
 *
 * 環境変数と.backlog-mcp.envファイルから設定を読み込み、
 * 優先順位に従って設定を管理します。
 * 要件7.3: 重要な操作とエラーをログに記録する
 * 要件10.1-10.7: ワークスペース固有設定のサポート
 */

import { existsSync, readFileSync } from 'node:fs';
import type { BacklogConfig } from '../types/index.js';
import * as logger from '../utils/logger.js';

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
   * 要件10.1-10.7: ワークスペース固有設定の実装
   */
  public loadConfig(): BacklogConfig {
    if (this._config) {
      return this._config;
    }

    try {
      logger.info('設定の読み込みを開始します');

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
          logger.info(`ワークスペース設定ファイルを読み込み中: ${configPath}`);
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
          logger.logConfigLoad(
            `ワークスペース設定ファイル: ${configPath}`,
            true,
          );
        } catch (error) {
          logger.logConfigLoad(
            `ワークスペース設定ファイル: ${configPath}`,
            false,
            error instanceof Error ? error.message : String(error),
          );
        }
      } else {
        logger.info(
          `ワークスペース設定ファイルが見つかりません: ${configPath}`,
        );
      }

      // 設定の優先順位処理：
      // 認証情報（要件10.4）は環境変数を優先、その他はワークスペース設定を優先
      const domain = systemEnv.BACKLOG_DOMAIN || workspaceConfig.BACKLOG_DOMAIN;
      const apiKey =
        systemEnv.BACKLOG_API_KEY || workspaceConfig.BACKLOG_API_KEY;
      const defaultProject =
        workspaceConfig.BACKLOG_DEFAULT_PROJECT ||
        systemEnv.BACKLOG_DEFAULT_PROJECT;
      const maxRetries =
        workspaceConfig.BACKLOG_MAX_RETRIES ||
        systemEnv.BACKLOG_MAX_RETRIES ||
        '3';
      const timeout =
        workspaceConfig.BACKLOG_TIMEOUT || systemEnv.BACKLOG_TIMEOUT || '30000';

      // 必須設定の検証
      if (!domain || !apiKey) {
        const errorMessage =
          'BACKLOG_DOMAIN と BACKLOG_API_KEY が設定されていません。' +
          '環境変数または .backlog-mcp.env ファイルで設定してください。';
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      // 設定値の検証とサニタイズ
      const parsedMaxRetries = parseInt(maxRetries, 10);
      const parsedTimeout = parseInt(timeout, 10);

      if (
        Number.isNaN(parsedMaxRetries) ||
        parsedMaxRetries < 0 ||
        parsedMaxRetries > 10
      ) {
        logger.warn('リトライ回数が無効です。デフォルト値(3)を使用します', {
          specified: maxRetries,
          default: 3,
        });
      }

      if (
        Number.isNaN(parsedTimeout) ||
        parsedTimeout < 1000 ||
        parsedTimeout > 300000
      ) {
        logger.warn(
          'タイムアウト値が無効です。デフォルト値(30000ms)を使用します',
          {
            specified: timeout,
            default: 30000,
          },
        );
      }

      this._config = {
        domain: domain,
        apiKey: apiKey,
        defaultProject: defaultProject,
        maxRetries:
          Number.isNaN(parsedMaxRetries) ||
          parsedMaxRetries < 0 ||
          parsedMaxRetries > 10
            ? 3
            : parsedMaxRetries,
        timeout:
          Number.isNaN(parsedTimeout) ||
          parsedTimeout < 1000 ||
          parsedTimeout > 300000
            ? 30000
            : parsedTimeout,
      };

      logger.info('設定の読み込みが完了しました', {
        domain: this._config.domain,
        hasApiKey: !!this._config.apiKey,
        defaultProject: this._config.defaultProject,
        maxRetries: this._config.maxRetries,
        timeout: this._config.timeout,
        configSource: existsSync(configPath)
          ? 'ワークスペース + 環境変数'
          : '環境変数のみ',
      });

      return this._config;
    } catch (error) {
      logger.logError('設定の読み込みに失敗しました', error);
      throw error;
    }
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
    logger.debug('設定をリセットしました');
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
   * 要件10.3: プロジェクトIDを省略した課題取得でそのプロジェクトを使用する
   */
  public resolveProjectIdOrKey(projectIdOrKey?: string): string {
    if (projectIdOrKey) {
      logger.debug(`明示的なプロジェクトIDを使用: ${projectIdOrKey}`);
      return projectIdOrKey;
    }

    const defaultProject = this.getDefaultProject();
    if (!defaultProject) {
      const errorMessage =
        'プロジェクトIDまたはキーが指定されておらず、デフォルトプロジェクトも設定されていません。' +
        'BACKLOG_DEFAULT_PROJECTを設定するか、プロジェクトIDを明示的に指定してください。';
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    logger.debug(`デフォルトプロジェクトを使用: ${defaultProject}`);
    return defaultProject;
  }

  /**
   * 設定情報のサマリーを取得（デバッグ用）
   */
  public getConfigSummary(): {
    domain: string;
    maskedApiKey: string;
    defaultProject?: string;
    maxRetries: number;
    timeout: number;
    hasWorkspaceConfig: boolean;
  } {
    const config = this.getConfig();
    const envConfigPath = process.env.BACKLOG_CONFIG_PATH;
    const configPath =
      envConfigPath && envConfigPath.trim().length > 0
        ? envConfigPath
        : '.backlog-mcp.env';

    return {
      domain: config.domain,
      maskedApiKey: this.getMaskedApiKey(),
      defaultProject: config.defaultProject,
      maxRetries: config.maxRetries,
      timeout: config.timeout,
      hasWorkspaceConfig: existsSync(configPath),
    };
  }
}
