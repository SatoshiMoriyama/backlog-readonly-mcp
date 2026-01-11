# タイトル

## はじめに

### この記事で学べること

### 前提知識・条件

## やってみた

## まとめ

## 開発メモ

### Backlog読み取り専用MCPサーバーの設定試行錯誤

#### 設定構成の最終形

- **認証情報**: `.zshrc` のシステム環境変数（`BACKLOG_DOMAIN`, `BACKLOG_API_KEY`）
- **ワークスペース設定**: ワークスペースルートの `.backlog-mcp.env`（`BACKLOG_DEFAULT_PROJECT`）
- **MCP設定**: `${workspaceFolder}` 変数でワークスペース固有の設定ファイルを参照

#### 試行錯誤のポイント

1. **環境変数の管理方法**
   - 当初は設定ファイルに直接記載を検討
   - セキュリティ上の理由でシステム環境変数に移行
   - `approvedEnvironmentVariables` の設定が必要

2. **ワークスペース固有設定の実現**
   - プロジェクトごとに異なるデフォルトプロジェクトを設定したい
   - `${workspaceFolder}` 変数の利用可能性を検証
   - ConfigManager での設定ファイル検索順序の実装

3. **プロジェクトID vs プロジェクトキー**
   - 当初はプロジェクトキー（`TECH`）を使用
   - Backlog API の仕様でプロジェクト ID が必要と判明
   - 両方対応できるよう修正（キー→ID 変換機能を追加）

4. **`${workspaceFolder}` 変数の検証**
   - Kiro は VS Code フォークのため変数展開をサポート
   - `args` での使用は失敗、`env` での使用で成功
   - 最終的に `BACKLOG_CONFIG_PATH: "${workspaceFolder}/.backlog-mcp.env"` で実現

#### 動作確認結果

- デフォルトプロジェクト取得: ✅
- 課題一覧取得: ✅
- 条件絞り込み（キーワード、日付、ソート）: ✅
- プロジェクトキー→ID 変換: ✅

#### 学んだこと

- MCP サーバーでの環境変数管理のベストプラクティス
- Kiro での `${workspaceFolder}` 変数の正しい使用方法
- Backlog API の仕様（プロジェクト ID 必須）
- ワークスペース固有設定の実装パターン
