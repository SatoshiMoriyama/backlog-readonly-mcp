# Backlog読み取り専用MCPサーバー

Backlog APIを利用して、プロジェクト、課題、ユーザー情報などを参照できるMCP（Model Context Protocol）サーバーです。このMCPサーバーは読み取り専用に特化し、データの変更や作成は一切行いません。

## 特徴

- **読み取り専用**: データの変更や作成は一切行わず、安全にBacklogデータを参照
- **セキュリティ重視**: APIキーの安全な管理とマスキング機能
- **ワークスペース対応**: プロジェクトごとの設定ファイル対応
- **包括的なAPI**: プロジェクト、課題、ユーザー、Wiki、マスタデータの取得

## インストール

```bash
cd packages/backlog-readonly-mcp
npm install
npm run build
```

## 設定

### 1. 設定ファイルの作成

```bash
cp .backlog-mcp.env.example .backlog-mcp.env
```

### 2. 設定値の入力

`.backlog-mcp.env` ファイルを編集：

```bash
# 必須設定
BACKLOG_DOMAIN=your-company.backlog.com
BACKLOG_API_KEY=your-api-key-here

# オプション設定
BACKLOG_DEFAULT_PROJECT=MYPROJ
BACKLOG_MAX_RETRIES=3
BACKLOG_TIMEOUT=30000
```

### 3. MCPクライアント設定

MCPクライアント（Claude Desktop等）の設定ファイルに追加：

```json
{
  "mcpServers": {
    "backlog-readonly": {
      "command": "node",
      "args": ["path/to/packages/backlog-readonly-mcp/dist/index.js"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

## 使用方法

MCPクライアントから以下のツールが利用できます：

### プロジェクト関連
- `get_projects`: プロジェクト一覧の取得
- `get_project`: 特定プロジェクトの詳細取得
- `get_project_users`: プロジェクトメンバー一覧の取得

### 課題関連
- `get_issues`: 課題一覧の取得（検索条件付き）
- `get_issue`: 特定課題の詳細取得
- `get_issue_comments`: 課題のコメント一覧取得
- `get_issue_attachments`: 課題の添付ファイル一覧取得

### ユーザー関連
- `get_users`: ユーザー一覧の取得
- `get_user`: 特定ユーザーの詳細取得
- `get_myself`: 自分のユーザー情報取得

### Wiki関連
- `get_wikis`: Wiki一覧の取得
- `get_wiki`: 特定Wikiページの取得

### マスタデータ関連
- `get_priorities`: 優先度一覧の取得
- `get_statuses`: ステータス一覧の取得
- `get_resolutions`: 完了理由一覧の取得
- `get_categories`: カテゴリ一覧の取得

## 開発

```bash
# 開発モード（ウォッチモード）
npm run dev

# ビルド
npm run build

# テスト
npm test

# リント
npm run lint
```

## ライセンス

MIT