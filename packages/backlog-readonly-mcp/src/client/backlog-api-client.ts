/**
 * Backlog APIクライアント
 *
 * Backlog REST APIとの通信を担当し、読み取り専用のGETリクエストのみを実行します。
 * 要件7.1-7.5: 包括的エラーハンドリング、ユーザーフレンドリーなエラーメッセージ、ログ機能
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
} from 'axios';
import { ConfigManager } from '../config/config-manager.js';
import {
  AuthenticationError,
  type BacklogConfig,
  NetworkError,
  ReadOnlyViolationError,
} from '../types/index.js';
import * as logger from '../utils/logger.js';

export class BacklogApiClient {
  private axiosInstance: AxiosInstance;
  private config: BacklogConfig;

  constructor(configManager?: ConfigManager) {
    const manager = configManager || ConfigManager.getInstance();
    this.config = manager.getConfig();

    this.axiosInstance = axios.create({
      baseURL: `https://${this.config.domain}/api/v2`,
      timeout: this.config.timeout,
      params: {
        apiKey: this.config.apiKey,
      },
    });

    // レスポンスインターセプターでエラーハンドリング
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error),
    );

    logger.info('BacklogApiClientが初期化されました', {
      domain: this.config.domain,
      timeout: this.config.timeout,
    });
  }

  /**
   * GETリクエストを実行（読み取り専用）
   */
  public async get<T = unknown>(
    endpoint: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      logger.logApiOperation('GET', endpoint, params);

      const result = await this.executeWithRetry(async () => {
        const response: AxiosResponse<T> = await this.axiosInstance.get(
          endpoint,
          {
            params,
          },
        );
        return response.data;
      });

      const duration = Date.now() - startTime;
      logger.logApiOperation('GET_SUCCESS', endpoint, params, duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logError('API_REQUEST_FAILED', error, {
        endpoint,
        params,
        duration,
      });
      throw error;
    }
  }

  /**
   * リトライ機能付きでリクエストを実行
   * 要件7.4: レート制限に達したとき、適切な待機時間を設ける
   */
  private async executeWithRetry<T>(requestFn: () => Promise<T>): Promise<T> {
    let attempt = 0;

    // 再帰ではなくループでリトライを行うことで、スタックオーバーフローのリスクを避ける
    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt += 1;

      try {
        return await requestFn();
      } catch (error) {
        if (attempt <= this.config.maxRetries && this.shouldRetry(error)) {
          const waitTime = this.calculateBackoffDelay(attempt);
          logger.warn(
            `リクエストが失敗しました。${waitTime / 1000}秒後にリトライします (${attempt}/${this.config.maxRetries})`,
            { error: error instanceof Error ? error.message : String(error) },
          );

          await this.delay(waitTime);
          continue;
        }

        // リトライ回数を超えた場合、または リトライ不可能なエラーの場合
        logger.error(
          `リクエストが最終的に失敗しました (試行回数: ${attempt})`,
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );

        throw this.convertToBacklogError(error);
      }
    }
  }

  /**
   * リトライすべきエラーかどうかを判定
   */
  private shouldRetry(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      // 429 (レート制限) または 5xx系エラーの場合はリトライ
      if (status === 429 || (status !== undefined && status >= 500)) {
        return true;
      }

      // ネットワークエラー（レスポンスがない場合）の場合
      if (!error.response && error.request) {
        // 永続的なエラーコードの場合はリトライしない
        const permanentErrorCodes = [
          'ENOTFOUND', // DNS解決エラー
          'ECONNREFUSED', // 接続拒否
          'EHOSTUNREACH', // ホスト到達不可
          'ENOENT', // ファイルまたはディレクトリが存在しない
          'EACCES', // アクセス権限エラー
          'EPERM', // 操作が許可されていない
        ];

        if (error.code && permanentErrorCodes.includes(error.code)) {
          return false;
        }

        // その他のネットワークエラー（一時的な可能性がある）はリトライ
        return true;
      }
    }

    return false;
  }

  /**
   * バックオフ遅延時間を計算
   */
  private calculateBackoffDelay(attempt: number): number {
    // 指数バックオフ: 1秒, 2秒, 4秒, 8秒... (最大30秒)
    return Math.min(2 ** (attempt - 1) * 1000, 30000);
  }

  /**
   * 指定時間待機
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 読み取り専用制限：POST、PUT、DELETEリクエストは禁止
   * 要件6.2: POST、PUT、DELETE リクエストを一切送信しない
   */
  public async post(): Promise<never> {
    const errorMessage =
      'このMCPサーバーは読み取り専用です。POSTリクエストは許可されていません。';
    logger.error('読み取り専用制限違反: POST試行', { operation: 'POST' });
    throw new ReadOnlyViolationError(errorMessage);
  }

  public async put(): Promise<never> {
    const errorMessage =
      'このMCPサーバーは読み取り専用です。PUTリクエストは許可されていません。';
    logger.error('読み取り専用制限違反: PUT試行', { operation: 'PUT' });
    throw new ReadOnlyViolationError(errorMessage);
  }

  public async delete(): Promise<never> {
    const errorMessage =
      'このMCPサーバーは読み取り専用です。DELETEリクエストは許可されていません。';
    logger.error('読み取り専用制限違反: DELETE試行', { operation: 'DELETE' });
    throw new ReadOnlyViolationError(errorMessage);
  }

  /**
   * APIキーの有効性を検証
   */
  public async validateApiKey(): Promise<boolean> {
    try {
      logger.info('APIキーの有効性を検証中...');
      await this.get('/users/myself');
      logger.info('APIキーの検証に成功しました');
      return true;
    } catch (error) {
      logger.logError('APIキーの検証に失敗しました', error);
      return false;
    }
  }

  /**
   * レート制限の処理
   * 要件7.4: レート制限に達したとき、適切な待機時間を設ける
   */
  private async handleRateLimit(retryAfter: number): Promise<void> {
    const waitTime = Math.min(retryAfter * 1000, 60000); // 最大60秒
    logger.logRateLimit(retryAfter, 1);
    await this.delay(waitTime);
  }

  /**
   * エラーハンドリング
   * 要件7.1: APIエラーレスポンスが返されたとき、適切なエラーメッセージを生成する
   *
   * レート制限(HTTP 429)の場合は待機後に同じリクエストを再送し、
   * そのレスポンス（AxiosResponse）を返します。それ以外のエラーは再スローします。
   */
  private async handleError(error: AxiosError): Promise<AxiosResponse> {
    if (error.response?.status === 429) {
      // レート制限の場合
      const retryAfter = parseInt(
        error.response.headers['retry-after'] || '60',
        10,
      );
      await this.handleRateLimit(retryAfter);

      // リトライ
      if (error.config) {
        const response = await this.axiosInstance.request(error.config);
        return response;
      }
    }

    throw error;
  }

  /**
   * エラーをBacklogErrorに変換
   * 要件7.5: ユーザーフレンドリーなエラーメッセージを提供する
   */
  private convertToBacklogError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const response = error.response;

      if (response) {
        // APIエラーレスポンス
        const backlogError = response.data;
        const _errorCode =
          backlogError?.errors?.[0]?.code || `HTTP_${response.status}`;
        const errorMessage = this.createUserFriendlyMessage(
          response.status,
          backlogError?.errors?.[0]?.message || error.message,
        );

        // ステータスコードに応じて適切なエラークラスを返す
        if (response.status === 401 || response.status === 403) {
          return new AuthenticationError(errorMessage);
        }

        return new Error(errorMessage);
      } else if (error.request) {
        // ネットワークエラー
        return new NetworkError(
          'ネットワークに接続できません。インターネット接続を確認してください。',
        );
      } else if (error.code === 'ENOTFOUND') {
        // DNS解決エラー
        return new NetworkError(
          'Backlogドメインが見つかりません。BACKLOG_DOMAINの設定を確認してください。',
        );
      } else if (error.code === 'ECONNABORTED') {
        // タイムアウトエラー
        return new NetworkError(
          'リクエストがタイムアウトしました。しばらく時間をおいて再試行してください。',
        );
      }
    }

    // その他のエラー
    return new Error(
      error instanceof Error
        ? error.message
        : '予期しないエラーが発生しました。しばらく時間をおいて再試行してください。',
    );
  }

  /**
   * ユーザーフレンドリーなエラーメッセージを作成
   * 要件7.5: ユーザーフレンドリーなエラーメッセージを提供する
   */
  private createUserFriendlyMessage(
    status: number,
    originalMessage: string,
  ): string {
    switch (status) {
      case 400:
        return `リクエストが無効です: ${originalMessage}`;
      case 401:
        return 'APIキーが無効です。BACKLOG_API_KEYの設定を確認してください。';
      case 403:
        return 'このリソースにアクセスする権限がありません。プロジェクトのメンバーであることを確認してください。';
      case 404:
        return `指定されたリソースが見つかりません: ${originalMessage}`;
      case 429:
        return 'APIの利用制限に達しました。しばらく時間をおいて再試行してください。';
      case 500:
        return 'Backlogサーバーで内部エラーが発生しました。しばらく時間をおいて再試行してください。';
      case 502:
      case 503:
      case 504:
        return 'Backlogサーバーが一時的に利用できません。しばらく時間をおいて再試行してください。';
      default:
        return originalMessage;
    }
  }

  /**
   * 設定情報を取得（デバッグ用）
   */
  public getConfigInfo(): {
    domain: string;
    maskedApiKey: string;
    defaultProject?: string;
  } {
    const manager = ConfigManager.getInstance();
    return {
      domain: this.config.domain,
      maskedApiKey: manager.getMaskedApiKey(),
      defaultProject: this.config.defaultProject,
    };
  }
}
