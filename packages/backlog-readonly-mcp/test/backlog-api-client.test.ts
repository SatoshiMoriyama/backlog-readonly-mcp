/**
 * BacklogAPIクライアントのプロパティテスト
 *
 * プロパティ 1: 認証処理の包括性
 * 検証対象: 要件 1.1, 1.2, 1.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { BacklogApiClient } from '../src/client/backlog-api-client.js';
import { ConfigManager } from '../src/config/config-manager.js';

// axiosをモック
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('BacklogApiClient Property Tests', () => {
  let originalEnv: Record<string, string | undefined>;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // 環境変数を保存
    originalEnv = {
      BACKLOG_DOMAIN: process.env.BACKLOG_DOMAIN,
      BACKLOG_API_KEY: process.env.BACKLOG_API_KEY,
    };

    // ConfigManagerをリセット
    ConfigManager.getInstance().reset();

    // axiosインスタンスのモック
    mockAxiosInstance = {
      get: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance);
    mockedAxios.isAxiosError = vi.fn();
  });

  afterEach(() => {
    // 環境変数を復元
    Object.keys(originalEnv).forEach((key) => {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    });

    // ConfigManagerをリセット
    ConfigManager.getInstance().reset();

    // モックをクリア
    vi.clearAllMocks();
  });

  /**
   * プロパティ 1: 認証処理の包括性
   *
   * For any valid API configuration, the client should properly authenticate
   * and handle authentication errors consistently
   *
   * 検証対象: 要件 1.1, 1.2, 1.3
   */
  it('Property 1: Authentication handling comprehensiveness - **Validates: Requirements 1.1, 1.2, 1.3**', async () => {
    const testConfigs = [
      {
        domain: 'test1.backlog.com',
        apiKey: 'valid-api-key-1',
        shouldSucceed: true,
      },
      {
        domain: 'test2.backlog.com',
        apiKey: 'valid-api-key-2',
        shouldSucceed: true,
      },
      {
        domain: 'test3.backlog.com',
        apiKey: 'invalid-api-key',
        shouldSucceed: false,
      },
    ];

    for (const config of testConfigs) {
      // 環境変数を設定
      process.env.BACKLOG_DOMAIN = config.domain;
      process.env.BACKLOG_API_KEY = config.apiKey;

      // ConfigManagerをリセット
      ConfigManager.getInstance().reset();

      // APIレスポンスをモック
      if (config.shouldSucceed) {
        mockAxiosInstance.get.mockResolvedValue({
          data: { id: 1, userId: 'testuser', name: 'Test User' },
        });
      } else {
        const error = new Error('Unauthorized');
        (error as any).response = {
          status: 401,
          data: {
            errors: [{ code: 'Unauthorized', message: 'Invalid API key' }],
          },
        };
        mockedAxios.isAxiosError.mockReturnValue(true);
        mockAxiosInstance.get.mockRejectedValue(error);
      }

      const client = new BacklogApiClient();

      // APIキー検証の一貫性をテスト
      const isValid1 = await client.validateApiKey();
      const isValid2 = await client.validateApiKey();

      // 結果の一貫性を検証
      expect(isValid1).toBe(isValid2);
      expect(isValid1).toBe(config.shouldSucceed);

      // 設定情報の取得をテスト
      const configInfo = client.getConfigInfo();
      expect(configInfo.domain).toBe(config.domain);
      expect(configInfo.maskedApiKey).toBeDefined();
      expect(configInfo.maskedApiKey).not.toBe(config.apiKey); // APIキーがマスキングされていることを確認
    }
  });

  /**
   * プロパティ 1: 読み取り専用制限の徹底
   *
   * For any BacklogApiClient instance, write operations should be consistently rejected
   *
   * 検証対象: 要件 6.1, 6.2
   */
  it('Property 1: Read-only restriction enforcement - **Validates: Requirements 6.1, 6.2**', async () => {
    // テスト用設定
    process.env.BACKLOG_DOMAIN = 'test.backlog.com';
    process.env.BACKLOG_API_KEY = 'test-api-key';

    const client = new BacklogApiClient();

    // 書き込み操作が一貫して拒否されることを検証
    await expect(client.post()).rejects.toThrow('読み取り専用');
    await expect(client.put()).rejects.toThrow('読み取り専用');
    await expect(client.delete()).rejects.toThrow('読み取り専用');

    // 複数回実行しても同じ結果になることを確認
    await expect(client.post()).rejects.toThrow('読み取り専用');
    await expect(client.put()).rejects.toThrow('読み取り専用');
    await expect(client.delete()).rejects.toThrow('読み取り専用');
  });

  /**
   * プロパティ 1: エラーハンドリングの一貫性
   *
   * For any error response, the client should consistently convert it to BacklogError format
   *
   * 検証対象: 要件 7.1, 7.2, 7.3
   */
  it('Property 1: Error handling consistency - **Validates: Requirements 7.1, 7.2, 7.3**', async () => {
    // テスト用設定
    process.env.BACKLOG_DOMAIN = 'test.backlog.com';
    process.env.BACKLOG_API_KEY = 'test-api-key';

    const client = new BacklogApiClient();

    const errorScenarios = [
      {
        name: 'API Error',
        error: {
          response: {
            status: 404,
            data: {
              errors: [{ code: 'NotFound', message: 'Resource not found' }],
            },
          },
        },
      },
      {
        name: 'Network Error',
        error: {
          request: {},
          message: 'Network Error',
        },
      },
      {
        name: 'Rate Limit Error',
        error: {
          response: {
            status: 429,
            headers: { 'retry-after': '60' },
            data: {
              errors: [
                { code: 'TooManyRequests', message: 'Rate limit exceeded' },
              ],
            },
          },
        },
      },
    ];

    for (const scenario of errorScenarios) {
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.get.mockRejectedValue(scenario.error);

      try {
        await client.get('/test-endpoint');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // BacklogError形式に変換されていることを確認
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(typeof error.code).toBe('string');
        expect(typeof error.message).toBe('string');
      }

      // 次のテストのためにモックをリセット
      vi.clearAllMocks();
      mockAxiosInstance.get.mockClear();
    }
  });

  /**
   * プロパティ 1: リトライ機能の一貫性
   *
   * For any retryable error, the client should consistently retry according to configuration
   *
   * 検証対象: 要件 7.4
   */
  it('Property 1: Retry mechanism consistency - **Validates: Requirements 7.4**', async () => {
    // テスト用設定（リトライ回数を2回に設定）
    process.env.BACKLOG_DOMAIN = 'test.backlog.com';
    process.env.BACKLOG_API_KEY = 'test-api-key';
    process.env.BACKLOG_MAX_RETRIES = '2';

    const client = new BacklogApiClient();

    // 500エラー（リトライ対象）をモック
    const serverError = {
      response: {
        status: 500,
        data: {
          errors: [{ code: 'InternalServerError', message: 'Server error' }],
        },
      },
    };

    mockedAxios.isAxiosError.mockReturnValue(true);
    mockAxiosInstance.get
      .mockRejectedValueOnce(serverError)
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce({ data: { success: true } });

    // リトライが実行されることを確認
    const result = await client.get('/test-endpoint');
    expect(result).toEqual({ success: true });
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3); // 初回 + 2回リトライ

    // 401エラー（リトライ対象外）をモック
    vi.clearAllMocks();
    const authError = {
      response: {
        status: 401,
        data: { errors: [{ code: 'Unauthorized', message: 'Unauthorized' }] },
      },
    };

    mockAxiosInstance.get.mockRejectedValueOnce(authError);

    try {
      await client.get('/test-endpoint');
      expect.fail('Should have thrown an error');
    } catch (error) {
      // リトライされずに即座にエラーになることを確認
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    }
  });
});
