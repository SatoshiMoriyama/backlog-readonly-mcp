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
import { WhitelistManager } from './whitelist-manager.js';

export class ConfigManager {
  private static instance: ConfigManager;
  private _config: BacklogConfig | null = null;
  private whitelistManager: WhitelistManager | null = null;

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
      logger.debug(`カレントディレクトリ: ${process.cwd()}`);

      // システム環境変数を保存
      const systemEnv = {
        BACKLOG_DOMAIN: process.env.BACKLOG_DOMAIN,
        BACKLOG_API_KEY: process.env.BACKLOG_API_KEY,
        BACKLOG_DEFAULT_PROJECT: process.env.BACKLOG_DEFAULT_PROJECT,
        BACKLOG_MAX_RETRIES: process.env.BACKLOG_MAX_RETRIES,
        BACKLOG_TIMEOUT: process.env.BACKLOG_TIMEOUT,
        BACKLOG_PROJECT_WHITELIST: process.env.BACKLOG_PROJECT_WHITELIST,
      };

      // ワークスペース設定ファイルから設定を読み込み
      const workspaceConfig: Record<string, string | undefined> = {};

      // BACKLOG_CONFIG_PATH環境変数で指定されたファイル、なければデフォルトの .backlog-mcp.env を読み込み
      const envConfigPath = process.env.BACKLOG_CONFIG_PATH;
      const configPath =
        envConfigPath && envConfigPath.trim().length > 0
          ? envConfigPath
          : '.backlog-mcp.env';

      logger.debug(`設定ファイルパス: ${configPath}`);

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

      // 検証ヘルパー関数
      const validateMaxRetries = (value: number): number => {
        if (Number.isNaN(value) || value < 0 || value > 10) {
          logger.warn('リトライ回数が無効です。デフォルト値(3)を使用します', {
            specified: maxRetries,
            default: 3,
          });
          return 3;
        }
        return value;
      };

      const validateTimeout = (value: number): number => {
        if (Number.isNaN(value) || value < 1000 || value > 300000) {
          logger.warn(
            'タイムアウト値が無効です。デフォルト値(30000ms)を使用します',
            {
              specified: timeout,
              default: 30000,
            },
          );
          return 30000;
        }
        return value;
      };

      // ホワイトリスト設定の読み込み（要件10: 設定ファイルのサポート）
      const whitelistConfig = this.loadWhitelistConfig(
        systemEnv.BACKLOG_PROJECT_WHITELIST,
        workspaceConfig.BACKLOG_PROJECT_WHITELIST,
      );

      // WhitelistManagerの初期化
      this.whitelistManager = new WhitelistManager(whitelistConfig);

      this._config = {
        domain: domain,
        apiKey: apiKey,
        defaultProject: defaultProject,
        maxRetries: validateMaxRetries(parsedMaxRetries),
        timeout: validateTimeout(parsedTimeout),
        projectWhitelist: whitelistConfig,
      };

      // デフォルトプロジェクトとホワイトリストの整合性検証（要件6）
      if (defaultProject && this.whitelistManager.isWhitelistEnabled()) {
        this.validateDefaultProjectInWhitelist(defaultProject);
      }

      logger.info('設定の読み込みが完了しました', {
        domain: this._config.domain,
        hasApiKey: !!this._config.apiKey,
        defaultProject: this._config.defaultProject,
        maxRetries: this._config.maxRetries,
        timeout: this._config.timeout,
        hasWhitelist: !!whitelistConfig,
        whitelistCount: whitelistConfig?.length ?? 0,
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
    this.whitelistManager = null;
  }

  /**
   * ホワイトリスト設定を読み込み
   * 環境変数を優先し、なければ設定ファイルから読み込む
   * 要件10.2: 環境変数と設定ファイルの両方に設定がある場合は環境変数を優先
   *
   * @param envWhitelist 環境変数からのホワイトリスト
   * @param fileWhitelist 設定ファイルからのホワイトリスト
   * @returns パースされたホワイトリスト配列、または undefined
   */
  private loadWhitelistConfig(
    envWhitelist?: string,
    fileWhitelist?: string,
  ): string[] | undefined {
    // 要件10.2: 環境変数を優先
    const whitelistStr = envWhitelist || fileWhitelist;

    if (!whitelistStr || whitelistStr.trim().length === 0) {
      return undefined;
    }

    // 要件1.2, 1.3: カンマ区切りで分割し、空白を除去して正規化
    const whitelist = whitelistStr
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (whitelist.length === 0) {
      return undefined;
    }

    // 要件8.1, 8.4: ホワイトリストの内容をログ出力（マスキング不要）
    logger.info(
      `プロジェクトホワイトリストを読み込みました: ${whitelist.length}件`,
      {
        source: envWhitelist ? '環境変数' : '設定ファイル',
        projects: whitelist,
      },
    );

    return whitelist;
  }

  /**
   * デフォルトプロジェクトがホワイトリストに含まれているか検証
   * 含まれていない場合はエラーログを出力し、例外をスロー
   * 要件6.1-6.7: デフォルトプロジェクトとホワイトリストの整合性検証
   *
   * @param defaultProject デフォルトプロジェクト
   */
  private validateDefaultProjectInWhitelist(defaultProject: string): void {
    if (!this.whitelistManager) {
      return;
    }

    // 要件6.2: ホワイトリストが無効の場合は検証をスキップ
    if (!this.whitelistManager.isWhitelistEnabled()) {
      return;
    }

    // 起動時検証の制限事項：
    // デフォルトプロジェクトの検証は、設定された文字列そのものがホワイトリストに含まれているかをチェックします。
    // 例：BACKLOG_DEFAULT_PROJECT="PROJ1" の場合、BACKLOG_PROJECT_WHITELIST にも "PROJ1" が必要
    //     （"12345" のようなIDのみでは起動時エラーになります）
    // これは起動時にAPI呼び出しを行わない設計によるものです。
    const isValid = this.whitelistManager.validateProjectAccess(defaultProject);

    if (!isValid) {
      // 要件6.3, 6.7: エラーログを出力
      const errorMessage =
        `デフォルトプロジェクト '${defaultProject}' はホワイトリストに含まれていません。` +
        `\n\nBACKLOG_DEFAULT_PROJECT と BACKLOG_PROJECT_WHITELIST の設定を確認してください。` +
        `\nデフォルトプロジェクトはホワイトリストに含まれている必要があります。` +
        `\n注意: デフォルトプロジェクトに指定した文字列そのもの（キーならキー、IDならID）が` +
        `ホワイトリストに含まれている必要があります。`;

      logger.error(errorMessage);

      // 要件6.4: 設定読み込みエラーとして例外をスロー
      throw new Error(errorMessage);
    }

    logger.info(
      `デフォルトプロジェクト '${defaultProject}' はホワイトリストに含まれています`,
    );
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

    // デフォルトプロジェクトがホワイトリストに含まれていることを保証（念のための再確認）
    // loadConfig()で既に検証済みだが、安全のため再確認
    if (this.whitelistManager?.isWhitelistEnabled()) {
      const isValid =
        this.whitelistManager.validateProjectAccess(defaultProject);
      if (!isValid) {
        const errorMessage =
          `デフォルトプロジェクト '${defaultProject}' はホワイトリストに含まれていません。` +
          `設定を確認してください。`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }
    }

    logger.debug(`デフォルトプロジェクトを使用: ${defaultProject}`);
    return defaultProject;
  }

  /**
   * WhitelistManagerを取得
   */
  public getWhitelistManager(): WhitelistManager | null {
    return this.whitelistManager;
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
