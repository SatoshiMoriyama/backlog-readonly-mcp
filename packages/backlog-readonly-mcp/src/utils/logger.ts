/**
 * ログユーティリティ
 *
 * MCPサーバーのログ出力を管理します。
 * 要件7.3: 重要な操作とエラーをログに記録する
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

let logLevel: LogLevel = LogLevel.INFO;

/**
 * ログレベルを設定
 */
export function setLogLevel(level: LogLevel): void {
  logLevel = level;
}

/**
 * エラーログ
 */
export function error(message: string, ...args: unknown[]): void {
  if (logLevel >= LogLevel.ERROR) {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR] ${timestamp} ${message}`, ...args);
  }
}

/**
 * 警告ログ
 */
export function warn(message: string, ...args: unknown[]): void {
  if (logLevel >= LogLevel.WARN) {
    const timestamp = new Date().toISOString();
    console.warn(`[WARN] ${timestamp} ${message}`, ...args);
  }
}

/**
 * 情報ログ
 */
export function info(message: string, ...args: unknown[]): void {
  if (logLevel >= LogLevel.INFO) {
    const timestamp = new Date().toISOString();
    console.log(`[INFO] ${timestamp} ${message}`, ...args);
  }
}

/**
 * デバッグログ
 */
export function debug(message: string, ...args: unknown[]): void {
  if (logLevel >= LogLevel.DEBUG) {
    const timestamp = new Date().toISOString();
    console.log(`[DEBUG] ${timestamp} ${message}`, ...args);
  }
}

/**
 * API操作のログ記録
 */
export function logApiOperation(
  operation: string,
  endpoint: string,
  params?: Record<string, unknown>,
  duration?: number,
): void {
  const message = `API操作: ${operation} ${endpoint}`;
  const details = {
    params: params ? Object.keys(params) : undefined,
    duration: duration ? `${duration}ms` : undefined,
  };
  info(message, details);
}

/**
 * エラー詳細のログ記録
 */
export function logError(
  context: string,
  err: unknown,
  additionalInfo?: Record<string, unknown>,
): void {
  const errorMessage = err instanceof Error ? err.message : String(err);
  const errorStack = err instanceof Error ? err.stack : undefined;

  error(`${context}: ${errorMessage}`, {
    stack: errorStack,
    ...additionalInfo,
  });
}

/**
 * レート制限のログ記録
 */
export function logRateLimit(retryAfter: number, attempt: number): void {
  warn(
    `レート制限に達しました。${retryAfter}秒後にリトライします (試行回数: ${attempt})`,
  );
}

/**
 * 設定読み込みのログ記録
 */
export function logConfigLoad(
  source: string,
  success: boolean,
  details?: string,
): void {
  if (success) {
    info(`設定を読み込みました: ${source}`, details ? { details } : undefined);
  } else {
    warn(
      `設定の読み込みに失敗しました: ${source}`,
      details ? { details } : undefined,
    );
  }
}
