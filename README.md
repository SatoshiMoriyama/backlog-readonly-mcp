# Backlog読み取り専用MCPサーバー

BacklogのAPIを利用して、プロジェクト、課題、ユーザー、Wikiなどの情報を読み取り専用で提供するModel Context Protocol（MCP）サーバーです。セキュリティを重視し、データの変更や作成は一切行いません。

## 特徴

- **読み取り専用**: データの変更・作成は一切行わず、GETリクエストのみを使用
- **セキュリティ重視**: APIキーの安全な管理とマスキング機能
- **ワークスペース対応**: プロジェクトごとに異なる設定を自動適用
- **デフォルトプロジェクト**: よく使うプロジェクトを設定して効率的に作業
- **包括的なツール**: プロジェクト、課題、ユーザー、Wiki、マスタデータの取得

## 公式MCPサーバーとの違い

[nulab公式のBacklog MCPサーバー](https://github.com/nulab/backlog-mcp-server)と比較して：

- **読み取り専用に特化**: データ変更機能を一切実装せず、誤操作のリスクを完全に排除
- **セキュリティ重視**: 最小権限の原則に基づいた設計
- **監査対応**: 読み取り専用であることが明確で、コンプライアンス要件に対応

## 提供ツール

### プロジェクト関連
- `get_projects`: プロジェクト一覧取得
- `get_project`: プロジェクト詳細取得
- `get_project_users`: プロジェクトメンバー取得

### 課題関連
- `get_issues`: 課題一覧取得（検索条件付き）
- `get_issue`: 課題詳細取得
- `get_issue_comments`: 課題コメント取得
- `get_issue_attachments`: 課題添付ファイル取得

### ユーザー関連
- `get_users`: ユーザー一覧取得
- `get_user`: ユーザー詳細取得
- `get_myself`: 自分のユーザー情報取得

### Wiki関連
- `get_wikis`: Wiki一覧取得
- `get_wiki`: 特定Wikiページ取得

### マスタデータ関連
- `get_priorities`: 優先度一覧取得
- `get_statuses`: ステータス一覧取得
- `get_resolutions`: 完了理由一覧取得
- `get_categories`: カテゴリ一覧取得

## インストール

```bash
npm install
npm run build
```

## 設定

### 環境変数

**必須環境変数**:
```bash
export BACKLOG_API_KEY="your-api-key-here"
export BACKLOG_DOMAIN="your-company.backlog.com"
```

**オプション環境変数**:
```bash
export BACKLOG_DEFAULT_PROJECT="MYPROJ"  # デフォルトプロジェクトキー
export BACKLOG_MAX_RETRIES="3"           # リトライ回数
export BACKLOG_TIMEOUT="30000"           # タイムアウト（ms）
```

### ワークスペース固有の設定

プロジェクトルートに`.backlog-mcp.env`ファイルを配置することで、ワークスペース固有の設定が可能です：

```bash
# .backlog-mcp.env
BACKLOG_DOMAIN="your-company.backlog.com"
BACKLOG_API_KEY="your-api-key-here"
BACKLOG_DEFAULT_PROJECT="MYPROJ"
```

**注意**: `.backlog-mcp.env`ファイルは`.gitignore`に追加してコミット対象外にしてください。

### MCPクライアント設定

```json
{
  "mcpServers": {
    "backlog-readonly": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## 使用例

### デフォルトプロジェクトの課題を取得
```typescript
await callTool("get_issues", {});
```

### 特定プロジェクトの課題を取得
```typescript
await callTool("get_issues", { projectId: "OTHERPROJ" });
```

### 課題詳細を取得
```typescript
await callTool("get_issue", { issueKey: "MYPROJ-123" });
```

### プロジェクト一覧を取得
```typescript
await callTool("get_projects", {});
```

## 開発

### 依存関係のインストール
```bash
npm install
```

### 開発サーバーの起動
```bash
npm run dev
```

### テストの実行
```bash
npm test
```

### ビルド
```bash
npm run build
```

## セキュリティ

- APIキーは環境変数またはワークスペース設定ファイルで管理
- ログ出力時にAPIキーを自動的にマスキング
- GETリクエストのみを使用し、データ変更は一切行わない
- 最小限の権限でBacklog APIにアクセス

## ライセンス

MIT License

## 貢献

Issue報告やPull Requestを歓迎します。

## 注意事項

このツールはMITライセンスの下で提供され、保証や公式サポートはありません。
内容を確認し、用途に適しているかを判断した上で、自己責任でご利用ください。
問題が発生した場合は、GitHub Issuesで報告してください。