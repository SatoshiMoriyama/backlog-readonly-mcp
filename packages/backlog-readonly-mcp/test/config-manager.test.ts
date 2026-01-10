/**
 * 設定管理クラスのプロパティテスト
 *
 * プロパティ 2: 設定読み込みの一貫性
 * 検証対象: 要件 1.4
 */

import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigManager } from '../src/config/config-manager.js';

describe('ConfigManager Property Tests', () => {
  const testConfigPath = join(process.cwd(), '.backlog-mcp.env');
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // 環境変数を保存
    originalEnv = {
      BACKLOG_DOMAIN: process.env.BACKLOG_DOMAIN,
      BACKLOG_API_KEY: process.env.BACKLOG_API_KEY,
      BACKLOG_DEFAULT_PROJECT: process.env.BACKLOG_DEFAULT_PROJECT,
      BACKLOG_MAX_RETRIES: process.env.BACKLOG_MAX_RETRIES,
      BACKLOG_TIMEOUT: process.env.BACKLOG_TIMEOUT,
    };

    // ConfigManagerをリセット
    ConfigManager.getInstance().reset();

    // テスト用設定ファイルが存在する場合は削除
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
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

    // テスト用設定ファイルを削除
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }

    // ConfigManagerをリセット
    ConfigManager.getInstance().reset();
  });

  /**
   * プロパティ 2: 設定読み込みの一貫性
   *
   * For any valid configuration values, loading configuration multiple times
   * should return the same values (consistency property)
   *
   * 検証対象: 要件 1.4
   */
  it('Property 2: Configuration loading consistency - **Validates: Requirements 1.4**', () => {
    // テストデータの生成
    const testConfigs = [
      {
        domain: 'test1.backlog.com',
        apiKey: 'test-api-key-1',
        defaultProject: 'PROJ1',
        maxRetries: '5',
        timeout: '45000',
      },
      {
        domain: 'test2.backlog.com',
        apiKey: 'test-api-key-2',
        defaultProject: undefined,
        maxRetries: '2',
        timeout: '15000',
      },
      {
        domain: 'test3.backlog.com',
        apiKey: 'test-api-key-3',
        defaultProject: 'PROJ3',
        maxRetries: undefined,
        timeout: undefined,
      },
    ];

    testConfigs.forEach((testConfig, _index) => {
      // 環境変数をクリア
      delete process.env.BACKLOG_DOMAIN;
      delete process.env.BACKLOG_API_KEY;
      delete process.env.BACKLOG_DEFAULT_PROJECT;
      delete process.env.BACKLOG_MAX_RETRIES;
      delete process.env.BACKLOG_TIMEOUT;

      // ConfigManagerをリセット
      ConfigManager.getInstance().reset();

      // 環境変数を設定
      process.env.BACKLOG_DOMAIN = testConfig.domain;
      process.env.BACKLOG_API_KEY = testConfig.apiKey;
      if (testConfig.defaultProject) {
        process.env.BACKLOG_DEFAULT_PROJECT = testConfig.defaultProject;
      }
      if (testConfig.maxRetries) {
        process.env.BACKLOG_MAX_RETRIES = testConfig.maxRetries;
      }
      if (testConfig.timeout) {
        process.env.BACKLOG_TIMEOUT = testConfig.timeout;
      }

      const manager = ConfigManager.getInstance();

      // 複数回設定を読み込み
      const config1 = manager.loadConfig();
      const config2 = manager.loadConfig();
      const config3 = manager.getConfig();

      // 一貫性の検証
      expect(config1).toEqual(config2);
      expect(config2).toEqual(config3);
      expect(config1.domain).toBe(testConfig.domain);
      expect(config1.apiKey).toBe(testConfig.apiKey);
      expect(config1.defaultProject).toBe(testConfig.defaultProject);
      expect(config1.maxRetries).toBe(
        parseInt(testConfig.maxRetries || '3', 10),
      );
      expect(config1.timeout).toBe(parseInt(testConfig.timeout || '30000', 10));
    });
  });

  /**
   * プロパティ 2: ワークスペース設定ファイルの優先順位
   *
   * For any configuration, workspace config file should override system environment variables
   *
   * 検証対象: 要件 1.4
   */
  it('Property 2: Workspace config priority - **Validates: Requirements 1.4**', () => {
    const testCases = [
      {
        systemEnv: {
          BACKLOG_DOMAIN: 'system.backlog.com',
          BACKLOG_API_KEY: 'system-api-key',
          BACKLOG_DEFAULT_PROJECT: 'SYSTEM',
          BACKLOG_MAX_RETRIES: '1',
          BACKLOG_TIMEOUT: '10000',
        },
        workspaceConfig: {
          BACKLOG_DOMAIN: 'workspace.backlog.com',
          BACKLOG_API_KEY: 'workspace-api-key',
          BACKLOG_DEFAULT_PROJECT: 'WORKSPACE',
          BACKLOG_MAX_RETRIES: '7',
          BACKLOG_TIMEOUT: '50000',
        },
      },
      {
        systemEnv: {
          BACKLOG_DOMAIN: 'system2.backlog.com',
          BACKLOG_API_KEY: 'system-api-key-2',
        },
        workspaceConfig: {
          BACKLOG_DOMAIN: 'workspace2.backlog.com',
          BACKLOG_API_KEY: 'workspace-api-key-2',
          BACKLOG_DEFAULT_PROJECT: 'WS2',
        },
      },
    ];

    testCases.forEach((testCase, _index) => {
      // 環境変数をクリア
      delete process.env.BACKLOG_DOMAIN;
      delete process.env.BACKLOG_API_KEY;
      delete process.env.BACKLOG_DEFAULT_PROJECT;
      delete process.env.BACKLOG_MAX_RETRIES;
      delete process.env.BACKLOG_TIMEOUT;

      // ConfigManagerをリセット
      ConfigManager.getInstance().reset();

      // システム環境変数を設定
      Object.entries(testCase.systemEnv).forEach(([key, value]) => {
        if (value) {
          process.env[key] = value;
        }
      });

      // ワークスペース設定ファイルを作成
      const configContent = Object.entries(testCase.workspaceConfig)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      writeFileSync(testConfigPath, configContent);

      const manager = ConfigManager.getInstance();
      const config = manager.loadConfig();

      // ワークスペース設定が優先されることを検証
      expect(config.domain).toBe(testCase.workspaceConfig.BACKLOG_DOMAIN);
      expect(config.apiKey).toBe(testCase.workspaceConfig.BACKLOG_API_KEY);
      expect(config.defaultProject).toBe(
        testCase.workspaceConfig.BACKLOG_DEFAULT_PROJECT,
      );

      if (testCase.workspaceConfig.BACKLOG_MAX_RETRIES) {
        expect(config.maxRetries).toBe(
          parseInt(testCase.workspaceConfig.BACKLOG_MAX_RETRIES, 10),
        );
      } else {
        expect(config.maxRetries).toBe(
          parseInt(testCase.systemEnv.BACKLOG_MAX_RETRIES || '3', 10),
        );
      }

      if (testCase.workspaceConfig.BACKLOG_TIMEOUT) {
        expect(config.timeout).toBe(
          parseInt(testCase.workspaceConfig.BACKLOG_TIMEOUT, 10),
        );
      } else {
        expect(config.timeout).toBe(
          parseInt(testCase.systemEnv.BACKLOG_TIMEOUT || '30000', 10),
        );
      }

      // テスト用設定ファイルを削除
      unlinkSync(testConfigPath);
    });
  });

  /**
   * プロパティ 2: APIキーマスキングの一貫性
   *
   * For any API key, masking should be consistent and preserve partial visibility
   *
   * 検証対象: 要件 1.4
   */
  it('Property 2: API key masking consistency - **Validates: Requirements 1.4**', () => {
    const testApiKeys = [
      'short',
      'medium-key',
      'very-long-api-key-for-testing-purposes',
      '12345678',
      '123456789',
      'a'.repeat(50),
    ];

    testApiKeys.forEach((apiKey) => {
      // 環境変数をクリア
      delete process.env.BACKLOG_DOMAIN;
      delete process.env.BACKLOG_API_KEY;

      // ConfigManagerをリセット
      ConfigManager.getInstance().reset();

      // テスト用設定
      process.env.BACKLOG_DOMAIN = 'test.backlog.com';
      process.env.BACKLOG_API_KEY = apiKey;

      const manager = ConfigManager.getInstance();
      manager.loadConfig();

      const maskedKey1 = manager.getMaskedApiKey();
      const maskedKey2 = manager.getMaskedApiKey();

      // マスキングの一貫性を検証
      expect(maskedKey1).toBe(maskedKey2);

      // マスキングのルールを検証
      if (apiKey.length <= 8) {
        expect(maskedKey1).toBe('*'.repeat(apiKey.length));
      } else {
        expect(maskedKey1).toMatch(/^.{4}\*+.{4}$/);
        expect(maskedKey1.substring(0, 4)).toBe(apiKey.substring(0, 4));
        expect(maskedKey1.substring(maskedKey1.length - 4)).toBe(
          apiKey.substring(apiKey.length - 4),
        );
      }

      // 元のAPIキーが漏洩していないことを確認
      // もともとAPIキー自体が全て'*'の場合は、マスキング後と同一でも漏洩とはみなさない
      if (apiKey !== '*'.repeat(apiKey.length)) {
        expect(maskedKey1).not.toBe(apiKey);
      }
    });
  });
});
