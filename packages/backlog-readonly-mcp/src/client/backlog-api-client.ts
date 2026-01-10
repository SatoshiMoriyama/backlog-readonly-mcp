/**
 * Backlog APIクライアント
 *
 * Backlog REST APIとの通信を担当し、読み取り専用のGETリクエストのみを実行します。
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
} from 'axios';
import { ConfigManager } from '../config/config-manager.js';
import type { BacklogConfig, BacklogError } from '../types/index.js';

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
  }

  /**
   * GETリクエストを実行（読み取り専用）
   */
  public async get<T = unknown>(
    endpoint: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    return this.executeWithRetry(async () => {
      const response: AxiosResponse<T> = await this.axiosInstance.get(
        endpoint,
        {
          params,
        },
      );
      return response.data;
    });
  }

  /**
   * リトライ機能付きでリクエストを実行
   */
  private async executeWithRetry<T>(requestFn: () => Promise<T>): Promise<T> {
    let attempt = 0;

    // 再帰ではなくループでリトライを行うことで、スタックオーバーフローのリスクを避ける
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await requestFn();
      } catch (error) {
        if (attempt < this.config.maxRetries && this.shouldRetry(error)) {
          console.warn(
            `リクエストが失敗しました。リトライします... (${attempt + 1}/${this.config.maxRetries})`,
          );
          await this.delay(Math.pow(2, attempt) * 1000); // 指数バックオフ
          attempt += 1;
          continue;
        }
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
      // 5xx系エラーまたは429（レート制限）の場合はリトライ
      return status === 429 || (status !== undefined && status >= 500);
    }
    return false;
  }

  /**
   * 指定時間待機
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 読み取り専用制限：POST、PUT、DELETEリクエストは禁止
   */
  public async post(): Promise<never> {
    throw new Error(
      'このMCPサーバーは読み取り専用です。POSTリクエストは許可されていません。',
    );
  }

  public async put(): Promise<never> {
    throw new Error(
      'このMCPサーバーは読み取り専用です。PUTリクエストは許可されていません。',
    );
  }

  public async delete(): Promise<never> {
    throw new Error(
      'このMCPサーバーは読み取り専用です。DELETEリクエストは許可されていません。',
    );
  }

  /**
   * APIキーの有効性を検証
   */
  public async validateApiKey(): Promise<boolean> {
    try {
      await this.get('/users/myself');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * レート制限の処理
   */
  private async handleRateLimit(retryAfter: number): Promise<void> {
    const waitTime = Math.min(retryAfter * 1000, 60000); // 最大60秒
    console.error(`レート制限に達しました。${waitTime / 1000}秒待機します...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  /**
   * エラーハンドリング
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
   */
  private convertToBacklogError(error: unknown): BacklogError {
    if (axios.isAxiosError(error)) {
      const response = error.response;

      if (response) {
        // APIエラーレスポンス
        const backlogError = response.data;
        return {
          code: backlogError?.errors?.[0]?.code || `HTTP_${response.status}`,
          message: backlogError?.errors?.[0]?.message || error.message,
          details: backlogError,
        };
      } else if (error.request) {
        // ネットワークエラー
        return {
          code: 'NETWORK_ERROR',
          message: 'ネットワークエラーが発生しました。接続を確認してください。',
          details: error.message,
        };
      }
    }

    // その他のエラー
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || '不明なエラーが発生しました。',
      details: error,
    };
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
