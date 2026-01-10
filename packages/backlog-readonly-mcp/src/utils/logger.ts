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

export class Logger {
  private static level: LogLevel = LogLevel.INFO;

  /**
   * ログレベルを設定
   */
  public static setLevel(level: LogLevel): void {
    Logger.level = level;
  }

  /**
   * エラーログ
   */
  public static error(message: string, ...args: unknown[]): void {
    if (Logger.level >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  /**
   * 警告ログ
   */
  public static warn(message: string, ...args: unknown[]): void {
    if (Logger.level >= LogLevel.WARN) {
      console.error(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * 情報ログ
   */
  public static info(message: string, ...args: unknown[]): void {
    if (Logger.level >= LogLevel.INFO) {
      console.error(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * デバッグログ
   */
  public static debug(message: string, ...args: unknown[]): void {
    if (Logger.level >= LogLevel.DEBUG) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  }
}
