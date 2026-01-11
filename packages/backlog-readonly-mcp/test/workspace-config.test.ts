/**
 * ワークスペース固有設定の動作確認テスト
 *
 * 要件 10.1, 10.2, 10.3 の検証
 */

import {
  existsSync,
  mkdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigManager } from '../src/config/config-manager.js';

// テストファイルのディレクトリを基準にする（process.cwd()に依存しない）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testTempDir = join(__dirname, '.test-temp');

describe('Workspace Configuration Tests', () => {
  const testConfigPath = join(testTempDir, '.backlog-mcp.env.test');
  const defaultConfigPath = join(testTempDir, '.backlog-mcp.env');
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // 環境変数を保存
    originalEnv = {
      BACKLOG_DOMAIN: process.env.BACKLOG_DOMAIN,
      BACKLOG_API_KEY: process.env.BACKLOG_API_KEY,
      BACKLOG_DEFAULT_PROJECT: process.env.BACKLOG_DEFAULT_PROJECT,
      BACKLOG_MAX_RETRIES: process.env.BACKLOG_MAX_RETRIES,
      BACKLOG_TIMEOUT: process.env.BACKLOG_TIMEOUT,
      BACKLOG_CONFIG_PATH: process.env.BACKLOG_CONFIG_PATH,
    };

    // ConfigManagerをリセット
    ConfigManager.getInstance().reset();

    // テスト用一時ディレクトリを作成
    if (!existsSync(testTempDir)) {
      mkdirSync(testTempDir, { recursive: true });
    }

    // テスト用設定ファイルが存在する場合は削除
    [testConfigPath, defaultConfigPath].forEach((path) => {
      if (existsSync(path)) {
        unlinkSync(path);
      }
    });

    // デフォルトで存在しないパスを指定して、実際のワークスペース設定ファイルの影響を回避
    process.env.BACKLOG_CONFIG_PATH = join(testTempDir, '.backlog-mcp.env');
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

    // テスト用一時ディレクトリを削除
    if (existsSync(testTempDir)) {
      rmSync(testTempDir, { recursive: true, force: true });
    }

    // ConfigManagerをリセット
    ConfigManager.getInstance().reset();
  });

  /**
   * 要件 10.1: BACKLOG_CONFIG_PATH環境変数で指定されたファイルから設定を読み込む
   */
  it('should load config from BACKLOG_CONFIG_PATH specified file', () => {
    // システム環境変数を設定
    process.env.BACKLOG_DOMAIN = 'system.backlog.com';
    process.env.BACKLOG_API_KEY = 'system-api-key';
    process.env.BACKLOG_DEFAULT_PROJECT = 'SYSTEM';

    // カスタム設定ファイルを作成
    const customConfig = [
      'BACKLOG_DOMAIN=custom.backlog.com',
      'BACKLOG_API_KEY=custom-api-key',
      'BACKLOG_DEFAULT_PROJECT=CUSTOM',
      'BACKLOG_MAX_RETRIES=5',
      'BACKLOG_TIMEOUT=45000',
    ].join('\n');
    writeFileSync(testConfigPath, customConfig);

    // BACKLOG_CONFIG_PATH環境変数を設定
    process.env.BACKLOG_CONFIG_PATH = testConfigPath;

    const manager = ConfigManager.getInstance();
    const config = manager.loadConfig();

    // カスタム設定ファイルの値が使用されることを確認
    // 認証情報は環境変数を優先（要件10.4）
    expect(config.domain).toBe('system.backlog.com');
    expect(config.apiKey).toBe('system-api-key');
    // その他の設定はカスタム設定ファイルを優先
    expect(config.defaultProject).toBe('CUSTOM');
    expect(config.maxRetries).toBe(5);
    expect(config.timeout).toBe(45000);
  });

  /**
   * 要件 10.2: ワークスペース固有の設定ファイルが存在するとき、そのファイルからBACKLOG_DEFAULT_PROJECTを読み込む
   */
  it('should load BACKLOG_DEFAULT_PROJECT from workspace config file', () => {
    // システム環境変数を設定（デフォルトプロジェクトなし）
    process.env.BACKLOG_DOMAIN = 'test.backlog.com';
    process.env.BACKLOG_API_KEY = 'test-api-key';

    // ワークスペース設定ファイルを作成（デフォルトの .backlog-mcp.env）
    const workspaceConfig = ['BACKLOG_DEFAULT_PROJECT=WORKSPACE_PROJ'].join(
      '\n',
    );
    writeFileSync(defaultConfigPath, workspaceConfig);

    const manager = ConfigManager.getInstance();
    const config = manager.loadConfig();

    // ワークスペース設定からデフォルトプロジェクトが読み込まれることを確認
    expect(config.defaultProject).toBe('WORKSPACE_PROJ');
    expect(manager.hasDefaultProject()).toBe(true);
    expect(manager.getDefaultProject()).toBe('WORKSPACE_PROJ');
  });

  /**
   * 要件 10.3: デフォルトプロジェクトが設定されているとき、プロジェクトIDを省略した課題取得でそのプロジェクトを使用する
   */
  it('should use default project when project ID is omitted', () => {
    // システム環境変数を設定
    process.env.BACKLOG_DOMAIN = 'test.backlog.com';
    process.env.BACKLOG_API_KEY = 'test-api-key';
    process.env.BACKLOG_DEFAULT_PROJECT = 'DEFAULT_PROJ';

    // ワークスペース設定ファイルが存在しないことを確認
    if (existsSync(defaultConfigPath)) {
      unlinkSync(defaultConfigPath);
    }

    const manager = ConfigManager.getInstance();
    manager.reset(); // 確実にリセット
    manager.loadConfig();

    // プロジェクトIDを省略した場合、デフォルトプロジェクトが使用されることを確認
    const resolvedProject = manager.resolveProjectIdOrKey();
    expect(resolvedProject).toBe('DEFAULT_PROJ');

    // 明示的にプロジェクトIDを指定した場合、そちらが優先されることを確認
    const explicitProject = manager.resolveProjectIdOrKey('EXPLICIT_PROJ');
    expect(explicitProject).toBe('EXPLICIT_PROJ');
  });

  /**
   * 要件 10.4: 認証情報（BACKLOG_DOMAIN、BACKLOG_API_KEY）は環境変数から取得する
   */
  it('should get authentication info from environment variables', () => {
    // 環境変数のみで認証情報を設定
    process.env.BACKLOG_DOMAIN = 'env.backlog.com';
    process.env.BACKLOG_API_KEY = 'env-api-key';

    // ワークスペース設定ファイルには認証情報以外を設定
    const workspaceConfig = [
      'BACKLOG_DEFAULT_PROJECT=WS_PROJ',
      'BACKLOG_MAX_RETRIES=7',
    ].join('\n');
    writeFileSync(defaultConfigPath, workspaceConfig);

    // ConfigManagerをリセットして新しい設定を読み込み
    ConfigManager.getInstance().reset();
    const manager = ConfigManager.getInstance();
    const config = manager.loadConfig();

    // 認証情報は環境変数から取得されることを確認
    expect(config.domain).toBe('env.backlog.com');
    expect(config.apiKey).toBe('env-api-key');
    // その他の設定はワークスペース設定から取得されることを確認
    expect(config.defaultProject).toBe('WS_PROJ');
    expect(config.maxRetries).toBe(7);
  });

  /**
   * 要件 10.5: 設定ファイルが存在しないとき、環境変数のみを使用して動作する
   */
  it('should work with environment variables only when config file does not exist', () => {
    // 環境変数のみを設定
    process.env.BACKLOG_DOMAIN = 'env-only.backlog.com';
    process.env.BACKLOG_API_KEY = 'env-only-api-key';
    process.env.BACKLOG_DEFAULT_PROJECT = 'ENV_PROJ';
    process.env.BACKLOG_MAX_RETRIES = '2';
    process.env.BACKLOG_TIMEOUT = '20000';

    // 設定ファイルが存在しないことを確認
    expect(existsSync(defaultConfigPath)).toBe(false);

    const manager = ConfigManager.getInstance();
    const config = manager.loadConfig();

    // 環境変数の値が使用されることを確認
    expect(config.domain).toBe('env-only.backlog.com');
    expect(config.apiKey).toBe('env-only-api-key');
    expect(config.defaultProject).toBe('ENV_PROJ');
    expect(config.maxRetries).toBe(2);
    expect(config.timeout).toBe(20000);

    // 設定サマリーでワークスペース設定がないことを確認
    const summary = manager.getConfigSummary();
    expect(summary.hasWorkspaceConfig).toBe(false);
  });

  /**
   * 要件 10.6: 設定ファイルの形式として.envファイル形式をサポートする
   */
  it('should support .env file format', () => {
    // 環境変数を完全にクリア
    delete process.env.BACKLOG_DEFAULT_PROJECT;
    delete process.env.BACKLOG_MAX_RETRIES;
    delete process.env.BACKLOG_TIMEOUT;

    // システム環境変数を設定（認証情報のみ）
    process.env.BACKLOG_DOMAIN = 'test.backlog.com';
    process.env.BACKLOG_API_KEY = 'test-api-key';

    // .env形式の設定ファイルを作成（コメント、空行、クォート付き値を含む）
    const envConfig = [
      '# Backlog設定ファイル',
      '',
      'BACKLOG_DEFAULT_PROJECT=ENV_FORMAT_PROJ',
      'BACKLOG_MAX_RETRIES="8"',
      "BACKLOG_TIMEOUT='60000'",
      '# コメント行',
      'BACKLOG_CUSTOM_SETTING=value_with_equals=sign',
      '',
    ].join('\n');
    writeFileSync(defaultConfigPath, envConfig);

    // ConfigManagerを完全にリセット
    ConfigManager.getInstance().reset();
    const manager = ConfigManager.getInstance();
    const config = manager.loadConfig();

    // .env形式が正しく解析されることを確認
    expect(config.defaultProject).toBe('ENV_FORMAT_PROJ');
    expect(config.maxRetries).toBe(8);
    expect(config.timeout).toBe(60000);
  });

  /**
   * 要件 10.7: 無効な設定ファイルが指定されたとき、適切なエラーメッセージを返す
   */
  it('should handle invalid config file gracefully', () => {
    // システム環境変数を設定
    process.env.BACKLOG_DOMAIN = 'test.backlog.com';
    process.env.BACKLOG_API_KEY = 'test-api-key';

    // 存在しないファイルを指定
    process.env.BACKLOG_CONFIG_PATH = '/non/existent/path/.backlog-mcp.env';

    const manager = ConfigManager.getInstance();

    // 存在しないファイルでもエラーにならず、環境変数で動作することを確認
    expect(() => manager.loadConfig()).not.toThrow();

    const config = manager.loadConfig();
    expect(config.domain).toBe('test.backlog.com');
    expect(config.apiKey).toBe('test-api-key');
  });

  /**
   * デフォルトプロジェクトが設定されていない場合のエラーハンドリング
   */
  it('should throw error when no project ID and no default project', () => {
    // デフォルトプロジェクトなしで設定
    process.env.BACKLOG_DOMAIN = 'test.backlog.com';
    process.env.BACKLOG_API_KEY = 'test-api-key';

    const manager = ConfigManager.getInstance();
    manager.loadConfig();

    // プロジェクトIDを省略し、デフォルトプロジェクトもない場合はエラー
    expect(() => manager.resolveProjectIdOrKey()).toThrow();

    // エラーメッセージの内容を確認
    try {
      manager.resolveProjectIdOrKey();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain(
        'プロジェクトIDまたはキーが指定されておらず、デフォルトプロジェクトも設定されていません',
      );
    }
  });

  /**
   * 設定サマリー機能のテスト
   */
  it('should provide configuration summary', () => {
    // ConfigManagerをリセット
    ConfigManager.getInstance().reset();

    // 環境変数をクリア
    delete process.env.BACKLOG_DOMAIN;
    delete process.env.BACKLOG_API_KEY;
    delete process.env.BACKLOG_DEFAULT_PROJECT;
    delete process.env.BACKLOG_MAX_RETRIES;
    delete process.env.BACKLOG_TIMEOUT;

    // 環境変数を設定
    process.env.BACKLOG_DOMAIN = 'summary.backlog.com';
    process.env.BACKLOG_API_KEY = 'summary-api-key-12345678';
    process.env.BACKLOG_DEFAULT_PROJECT = 'SUMMARY_PROJ';

    // ワークスペース設定ファイルを作成
    const workspaceConfig = 'BACKLOG_MAX_RETRIES=9';
    writeFileSync(defaultConfigPath, workspaceConfig);

    // BACKLOG_CONFIG_PATHを明示的に設定して、作成したファイルを参照させる
    process.env.BACKLOG_CONFIG_PATH = defaultConfigPath;

    const manager = ConfigManager.getInstance();
    manager.loadConfig();

    const summary = manager.getConfigSummary();

    expect(summary.domain).toBe('summary.backlog.com');
    expect(summary.maskedApiKey).toMatch(/^summ\*+5678$/);
    expect(summary.defaultProject).toBe('SUMMARY_PROJ');
    expect(summary.maxRetries).toBe(9);
    expect(summary.timeout).toBe(30000); // デフォルト値
    expect(summary.hasWorkspaceConfig).toBe(true);
  });
});
