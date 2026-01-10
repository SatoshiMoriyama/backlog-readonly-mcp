/**
 * ログユーティリティ
 *
 * MCPサーバーのログ出力を管理します。
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
    console.error(`[ERROR] ${message}`, ...args);
  }
}

/**
 * 警告ログ
 */
export function warn(message: string, ...args: unknown[]): void {
  if (logLevel >= LogLevel.WARN) {
    console.warn(`[WARN] ${message}`, ...args);
  }
}

/**
 * 情報ログ
 */
export function info(message: string, ...args: unknown[]): void {
  if (logLevel >= LogLevel.INFO) {
    console.log(`[INFO] ${message}`, ...args);
  }
}

/**
 * デバッグログ
 */
export function debug(message: string, ...args: unknown[]): void {
  if (logLevel >= LogLevel.DEBUG) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}
