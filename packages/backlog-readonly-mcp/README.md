# Backlog読み取り専用MCPサーバー

Backlog API を利用して、プロジェクト、課題、ユーザー情報などを参照できる MCP（Model Context Protocol）サーバーです。この MCP サーバーは**読み取り専用**に特化し、データの変更や作成は一切行いません。

## 特徴

- 🔒 **完全読み取り専用**: データの変更・作成は一切行わない安全設計
- 🏢 **ワークスペース対応**: プロジェクトごとに異なる Backlog 設定が可能
- 🛠️ **豊富なツール**: プロジェクト、課題、ユーザー、Wiki、マスタデータの取得
- 🔑 **セキュア**: API キーの安全な管理とマスキング機能
- 📊 **包括的エラーハンドリング**: 詳細なログとユーザーフレンドリーなエラーメッセージ

## 使用方法

### 推奨：npxで直接実行（インストール不要）

```bash
npx backlog-readonly-mcp
```

### グローバルインストール（継続的に使用する場合）

```bash
npm install -g backlog-readonly-mcp
```

## 設定

### 1. 環境変数の設定

システム全体で使用する場合：

```bash
export BACKLOG_DOMAIN="your-company.backlog.com"
export BACKLOG_API_KEY="your-api-key-here"
```

### 2. ワークスペース固有の設定（推奨）

プロジェクトルートに `.backlog-mcp.env` ファイルを作成：

```bash
# .backlog-mcp.env
BACKLOG_DOMAIN="your-company.backlog.com"
BACKLOG_API_KEY="your-api-key-here"
BACKLOG_DEFAULT_PROJECT="MYPROJ"
BACKLOG_MAX_RETRIES="3"
BACKLOG_TIMEOUT="30000"
```

### 3. MCPクライアント設定

#### Claude Desktop

`~/.claude/claude_desktop_config.json` に追加：

```json
{
  "mcpServers": {
    "backlog-readonly": {
      "command": "npx",
      "args": ["backlog-readonly-mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

#### Cline (VS Code)

`.vscode/settings.json` に追加：

```json
{
  "cline.mcpServers": {
    "backlog-readonly": {
      "command": "npx",
      "args": ["backlog-readonly-mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

#### Cursor

`.cursor/mcp.json` に追加：

```json
{
  "mcpServers": {
    "backlog-readonly": {
      "command": "npx",
      "args": ["backlog-readonly-mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

## 利用可能なツール

### プロジェクト関連
- `get_projects` - プロジェクト一覧の取得
- `get_project` - 特定プロジェクトの詳細取得
- `get_project_users` - プロジェクトメンバー一覧の取得
- `get_default_project` - デフォルトプロジェクトの情報取得

### 課題関連
- `get_issues` - 課題一覧の取得（検索条件付き）
- `get_issue` - 特定課題の詳細取得
- `get_issue_comments` - 課題のコメント一覧取得
- `get_issue_attachments` - 課題の添付ファイル一覧取得

### ユーザー関連
- `get_users` - ユーザー一覧の取得
- `get_user` - 特定ユーザーの詳細取得
- `get_myself` - 自分のユーザー情報取得

### Wiki関連
- `get_wikis` - Wiki 一覧の取得
- `get_wiki` - 特定 Wiki ページの取得

### マスタデータ関連
- `get_priorities` - 優先度一覧の取得
- `get_statuses` - ステータス一覧の取得
- `get_resolutions` - 完了理由一覧の取得
- `get_categories` - カテゴリ一覧の取得

### システム関連
- `test_connection` - 接続テスト

## 使用例

### 基本的な使用方法

```typescript
// デフォルトプロジェクトの課題を取得
await callTool("get_issues", {});

// 特定プロジェクトの課題を取得
await callTool("get_issues", { projectId: "OTHERPROJ" });

// 課題の詳細を取得
await callTool("get_issue", { issueIdOrKey: "MYPROJ-123" });

// プロジェクト一覧を取得
await callTool("get_projects", {});
```

### 検索条件付きの課題取得

```typescript
// 担当者で絞り込み
await callTool("get_issues", {
  assigneeId: [123, 456],
  statusId: [1, 2, 3]
});

// キーワード検索
await callTool("get_issues", {
  keyword: "バグ修正",
  count: 50
});
```

## 設定オプション

| 環境変数 | 必須 | デフォルト | 説明 |
|---------|------|-----------|------|
| `BACKLOG_DOMAIN` | ✅ | - | Backlogドメイン（例: company.backlog.com） |
| `BACKLOG_API_KEY` | ✅ | - | Backlog APIキー |
| `BACKLOG_DEFAULT_PROJECT` | ❌ | - | デフォルトプロジェクトキー |
| `BACKLOG_MAX_RETRIES` | ❌ | 3 | APIリクエストのリトライ回数 |
| `BACKLOG_TIMEOUT` | ❌ | 30000 | APIリクエストのタイムアウト（ms） |

## セキュリティ

- **読み取り専用**: GET リクエストのみを使用し、データの変更は一切行いません
- **APIキーマスキング**: ログ出力時に API キーを自動的にマスキング
- **エラーハンドリング**: 詳細なエラー情報を提供しつつ、機密情報の漏洩を防止

## トラブルシューティング

### よくある問題

#### 1. APIキーエラー
```
認証エラー: APIキーが無効です
```
**解決方法**: `BACKLOG_API_KEY` の設定を確認してください。

#### 2. ドメインエラー
```
接続エラー: ドメインに接続できません
```
**解決方法**: `BACKLOG_DOMAIN` の設定を確認してください（https://は不要）。

#### 3. プロジェクトが見つからない
```
プロジェクトが見つかりません
```
**解決方法**: プロジェクトキーまたは ID を確認してください。

### デバッグモード

詳細なログを確認したい場合：

```bash
DEBUG=backlog-mcp:* npx backlog-readonly-mcp
```

## 開発

### ローカル開発

```bash
# 依存関係のインストール
npm install

# 開発モード（ウォッチモード）
npm run dev

# ビルド
npm run build

# テスト実行
npm test

# リント
npm run lint
```

### テスト

```bash
# 全テスト実行
npm test

# ウォッチモード
npm run test:watch

# 接続テスト
npm run inspector
```

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。

## サポート

- [GitHub Issues](https://github.com/SatoshiMoriyama/backlog-readonly-mcp/issues)
- [Backlog API ドキュメント](https://developer.nulab.com/docs/backlog/)
- [MCP プロトコル仕様](https://modelcontextprotocol.io/)