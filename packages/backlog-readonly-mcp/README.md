# Backlog読み取り専用MCPサーバー

Backlog API を利用して、プロジェクト、課題、ユーザー情報などを参照できる MCP（Model Context Protocol）サーバーです。この MCP サーバーは**読み取り専用**に特化し、データの変更や作成は一切行いません。

> **注意**: このプロジェクトは非公式のツールです。株式会社ヌーラボ（Backlog開発元）とは一切関係ありません。

## 特徴

- 🔒 **完全読み取り専用**: データの変更・作成は一切行わない安全設計
- 🏢 **ワークスペース対応**: プロジェクトごとに異なる Backlog 設定が可能
- 🛠️ **豊富なツール**: プロジェクト、課題、ユーザー、Wiki、ドキュメント、アクティビティ、マスタデータの取得
- 🔐 **プロジェクトホワイトリスト**: アクセス可能なプロジェクトを制限可能
- 🔑 **セキュア**: API キーの安全な管理とマスキング機能
- 📊 **包括的エラーハンドリング**: 詳細なログとユーザーフレンドリーなエラーメッセージ

## 設定

この MCP サーバーを使用するには、Backlog API の認証情報と MCP クライアントの設定が必要です。

### 必要な設定項目

以下の環境変数を設定する必要があります（詳細は「設定オプション」セクションを参照）：

- `BACKLOG_DOMAIN` (必須): Backlog のドメイン（例: `your-company.backlog.com`）
- `BACKLOG_API_KEY` (必須): Backlog API キー
- `BACKLOG_DEFAULT_PROJECT` (任意): デフォルトプロジェクトキー
- `BACKLOG_MAX_RETRIES` (任意): リトライ回数（デフォルト: 3）
- `BACKLOG_TIMEOUT` (任意): タイムアウト（デフォルト: 30000ms）
- `FASTMCP_LOG_LEVEL` (任意): ログレベル（デフォルト: INFO）

### 設定方法

#### 方法1: MCP設定ファイルに直接記載

```json
{
  "mcpServers": {
    "backlog-readonly": {
      "command": "npx",
      "args": ["-y", "backlog-readonly-mcp"],
      "env": {
        "BACKLOG_DOMAIN": "your-company.backlog.com",
        "BACKLOG_API_KEY": "your-api-key-here",
        "BACKLOG_DEFAULT_PROJECT": "MYPROJ"
      }
    }
  }
}
```

> **注意**: APIキーを直接記載する場合、このファイルをGitにコミットしないよう注意してください。

#### 方法2: システム環境変数を参照

事前にシステム環境変数を設定：

```bash
export BACKLOG_DOMAIN="your-company.backlog.com"
export BACKLOG_API_KEY="your-api-key-here"
export BACKLOG_DEFAULT_PROJECT="MYPROJ"
```

MCP 設定ファイル：
```json
{
  "mcpServers": {
    "backlog-readonly": {
      "command": "npx",
      "args": ["-y", "backlog-readonly-mcp"],
      "env": {
        "BACKLOG_DOMAIN": "${BACKLOG_DOMAIN}",
        "BACKLOG_API_KEY": "${BACKLOG_API_KEY}",
        "BACKLOG_DEFAULT_PROJECT": "${BACKLOG_DEFAULT_PROJECT}"
      }
    }
  }
}
```

> **Note**: 環境変数の参照方法（`${変数名}` の展開）はMCPクライアントによって異なります。展開されない場合は、方法1（直接記載）または方法3（設定ファイル使用）をご利用ください。

#### 方法3: 設定ファイルを使用（推奨）

プロジェクトルートに `.backlog-mcp.env` ファイルを作成：

```bash
# .backlog-mcp.env
BACKLOG_DOMAIN=your-company.backlog.com
BACKLOG_API_KEY=your-api-key-here
BACKLOG_DEFAULT_PROJECT=MYPROJ
```

> **重要**: `.backlog-mcp.env` を `.gitignore` に追加してください：
> ```
> # .gitignore
> .backlog-mcp.env
> ```

MCP設定ファイルで `BACKLOG_CONFIG_PATH` を指定：

```json
{
  "mcpServers": {
    "backlog-readonly": {
      "command": "npx",
      "args": ["-y", "backlog-readonly-mcp"],
      "env": {
        "BACKLOG_CONFIG_PATH": "/absolute/path/to/.backlog-mcp.env"
      }
    }
  }
}
```

MCPクライアントが `${workspaceFolder}` 変数をサポートしている場合：
```json
{
  "mcpServers": {
    "backlog-readonly": {
      "command": "npx",
      "args": ["-y", "backlog-readonly-mcp"],
      "env": {
        "BACKLOG_CONFIG_PATH": "${workspaceFolder}/.backlog-mcp.env"
      }
    }
  }
}
```

> **Note**: 
> - `${workspaceFolder}` 変数のサポートはMCPクライアントによって異なります
> - 展開されない場合は絶対パスを使用してください
> - `BACKLOG_CONFIG_PATH` を指定しない場合、カレントディレクトリの `.backlog-mcp.env` を探しますが、カレントディレクトリはMCPクライアントによって異なるため、明示的な指定を推奨します

## 利用可能なツール

### プロジェクト関連
- `get_projects` - プロジェクト一覧の取得
- `get_project` - 特定プロジェクトの詳細取得
- `get_project_users` - プロジェクトメンバー一覧の取得

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
- `get_recent_wikis` - 最近閲覧した Wiki 一覧の取得
- `get_wiki` - 特定 Wiki ページの取得

### ドキュメント関連
- `get_documents` - ドキュメント一覧の取得（プロジェクト指定・キーワード検索対応）
- `get_document` - 特定ドキュメントの取得
- `get_document_tree` - ドキュメントツリー構造の取得

### アクティビティ関連
- `get_space_activities` - スペース全体のアクティビティ取得
- `get_project_activities` - プロジェクトのアクティビティ取得
- `get_user_activities` - ユーザーのアクティビティ取得

### マスタデータ関連
- `get_priorities` - 優先度一覧の取得
- `get_statuses` - ステータス一覧の取得
- `get_resolutions` - 完了理由一覧の取得
- `get_categories` - カテゴリ一覧の取得

### システム関連
- `test_connection` - 接続テスト
- `get_default_project` - デフォルトプロジェクトの情報取得

## 使用方法（MCP設定後）

MCP 設定が完了すると、AI アシスタント（Kiro、Claude 等）が自動的に Backlog の情報を取得できるようになります。

### 基本的な質問例

- 「プロジェクト一覧を教えて」
- 「未完了の課題を教えて」
- 「MYPROJ-123 の詳細を教えて」
- 「今日期限の課題はある？」
- 「バグ修正に関する課題を検索して」

### 検索条件の指定

- 「担当者が田中さんの課題を教えて」
- 「優先度が高い課題を 50 件取得して」
- 「先週作成された課題を教えて」
- 「完了した課題の一覧を教えて」

## 設定オプション

| 環境変数 | 必須 | デフォルト | 説明 |
|---------|------|-----------|------|
| `BACKLOG_DOMAIN` | ✅ | - | Backlogドメイン（例: company.backlog.com） |
| `BACKLOG_API_KEY` | ✅ | - | Backlog APIキー |
| `BACKLOG_DEFAULT_PROJECT` | ❌ | - | デフォルトプロジェクトキー |
| `BACKLOG_PROJECT_WHITELIST` | ❌ | - | アクセス可能なプロジェクトの制限（カンマ区切り） |
| `BACKLOG_CONFIG_PATH` | ❌ | - | 設定ファイルのパス |
| `BACKLOG_MAX_RETRIES` | ❌ | 3 | APIリクエストのリトライ回数 |
| `BACKLOG_TIMEOUT` | ❌ | 30000 | APIリクエストのタイムアウト（ms） |
| `FASTMCP_LOG_LEVEL` | ❌ | INFO | ログレベル（ERROR, WARN, INFO, DEBUG） |

### ログレベルの設定

`FASTMCP_LOG_LEVEL` 環境変数でログの詳細度を調整できます：

- **`ERROR`**: エラーログのみ表示
- **`WARN`**: 警告とエラーログを表示
- **`INFO`**: 情報、警告、エラーログを表示（デフォルト）
- **`DEBUG`**: すべてのログを表示（デバッグ用）

#### 設定例

MCP設定ファイル：
```json
{
  "mcpServers": {
    "backlog-readonly": {
      "command": "npx",
      "args": ["-y", "backlog-readonly-mcp"],
      "env": {
        "FASTMCP_LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

ログの確認方法はMCPクライアントによって異なります。

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

#### 4. MCP設定エラー
```
command not found: backlog-readonly-mcp
```
**解決方法**: MCP 設定で `-y` フラグを追加してください：
```json
"args": ["-y", "backlog-readonly-mcp"]
```

#### 5. 設定ファイルが読み込まれない
**解決方法**: 
- ワークスペースルートに `.backlog-mcp.env` ファイルがあることを確認
- MCP 設定で `BACKLOG_CONFIG_PATH` が正しく設定されていることを確認
- 設定の優先順位：ワークスペース設定ファイル > 環境変数

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。

## サポート

- [GitHub Issues](https://github.com/SatoshiMoriyama/backlog-readonly-mcp/issues)
- [Backlog API ドキュメント](https://developer.nulab.com/docs/backlog/)
- [MCP プロトコル仕様](https://modelcontextprotocol.io/)
