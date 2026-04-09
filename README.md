# Backlog読み取り専用MCPサーバー

> **注意**: このプロジェクトは現在仕様策定段階です。実装はまだ完了していません。

Backlog の API を利用して、プロジェクト、課題、ユーザー、Wiki などの情報を読み取り専用で提供します。
Model Context Protocol（MCP）サーバーです。
セキュリティを重視し、データの変更や作成は一切行いません。

## 特徴

- **読み取り専用**: データの変更・作成は一切行わず、GET リクエストのみを使用
- **セキュリティ重視**: API キーの安全な管理とマスキング機能
- **プロジェクトホワイトリスト**: 特定のプロジェクトのみアクセス可能にする制限機能
- **ワークスペース対応**: プロジェクトごとに異なる設定を自動適用
- **デフォルトプロジェクト**: よく使うプロジェクトを設定して効率的に作業
- **包括的なツール**: プロジェクト、課題、ユーザー、Wiki、マスタデータの取得

## 公式MCPサーバーとの違い

[nulab 公式の Backlog MCP サーバー](https://github.com/nulab/backlog-mcp-server)と比較して。

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
- `get_wikis`: Wiki 一覧取得
- `get_wiki`: 特定 Wiki ページ取得

### マスタデータ関連
- `get_priorities`: 優先度の一覧取得
- `get_statuses`: ステータス一覧取得
- `get_resolutions`: 完了理由の一覧取得
- `get_categories`: カテゴリ一覧取得

## インストール（実装完了後）

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
export BACKLOG_DEFAULT_PROJECT="MYPROJ"           # デフォルトプロジェクトキー
export BACKLOG_PROJECT_WHITELIST="PROJ1,PROJ2"   # アクセス許可プロジェクト（ホワイトリスト）
export BACKLOG_MAX_RETRIES="3"                    # リトライ回数
export BACKLOG_TIMEOUT="30000"                    # タイムアウト（ms）
```

### ワークスペース固有の設定

プロジェクトルートに `.backlog-mcp.env` ファイルを配置することで、ワークスペース固有の設定が可能です。

```bash
# .backlog-mcp.env
BACKLOG_DOMAIN="your-company.backlog.com"
BACKLOG_API_KEY="your-api-key-here"
BACKLOG_DEFAULT_PROJECT="MYPROJ"
```

**注意**: `.backlog-mcp.env` ファイルは `.gitignore` に追加してコミット対象外にしてください。

## プロジェクトホワイトリスト機能

環境変数 `BACKLOG_PROJECT_WHITELIST` を設定することで、アクセス可能なプロジェクトを制限できます。

### 設定方法

**環境変数で設定**:
```bash
export BACKLOG_PROJECT_WHITELIST="PROJ1,PROJ2,12345"
```

**ワークスペース設定ファイルで設定**:
```bash
# .backlog-mcp.env
BACKLOG_PROJECT_WHITELIST="PROJ1,PROJ2,12345"
```

**設定形式**:
- カンマ区切りで複数のプロジェクトを指定
- プロジェクトキー（例: `PROJ1`）とプロジェクトID（例: `12345`）の両方をサポート
- **プロジェクトキーだけ**または**IDだけ**を設定すれば、どちらの形式でアクセスしても検証が通ります
- 空白は自動的に除去されます

### 動作

**ホワイトリスト有効時**:
- 指定されたプロジェクトのみにアクセス可能
- ホワイトリスト外のプロジェクトへのアクセスは拒否される
- プロジェクト横断で取得するツール（`get_projects`, `get_issues`, `get_recent_wikis`）は、結果が自動的にフィルタリングされます
- 単一プロジェクトにアクセスするツールは、アクセス前に検証が行われます
- 課題、Wiki、マスタデータなど、すべてのプロジェクト関連ツールで検証が行われます

**ホワイトリスト未設定時**（デフォルト）:
- すべてのプロジェクトにアクセス可能（後方互換性）

### デフォルトプロジェクトとの連携

デフォルトプロジェクト（`BACKLOG_DEFAULT_PROJECT`）を設定している場合：

- デフォルトプロジェクトは必ずホワイトリストに含まれている必要があります
- ホワイトリストに含まれていない場合、起動時にエラーが発生します

**正しい設定例**:
```bash
export BACKLOG_DEFAULT_PROJECT="PROJ1"
export BACKLOG_PROJECT_WHITELIST="PROJ1,PROJ2"  # PROJ1を含む
```

**エラーになる設定例**:
```bash
export BACKLOG_DEFAULT_PROJECT="PROJ1"
export BACKLOG_PROJECT_WHITELIST="PROJ2,PROJ3"  # PROJ1が含まれていない → エラー
```

### エラーメッセージ

ホワイトリスト外のプロジェクトにアクセスしようとすると、以下のようなエラーメッセージが表示されます：

```
プロジェクト 'PROJ3' へのアクセスは許可されていません。
このプロジェクトはホワイトリストに含まれていません。

アクセスを許可するには、BACKLOG_PROJECT_WHITELIST 環境変数に追加してください。
例: export BACKLOG_PROJECT_WHITELIST="PROJ1,PROJ2,PROJ3"
```

### 使用例

あるプロジェクトのキーが `MYPROJECT`、IDが `12345` だとします。

**プロジェクトキーで指定（推奨）**:
```bash
export BACKLOG_PROJECT_WHITELIST="MYPROJECT"
# このプロジェクトにはキー (MYPROJECT) でもID (12345) でもアクセス可能
```

**プロジェクトIDで指定**:
```bash
export BACKLOG_PROJECT_WHITELIST="12345"
# このプロジェクトにはキー (MYPROJECT) でもID (12345) でもアクセス可能
```

**複数プロジェクトを指定**:
```bash
export BACKLOG_PROJECT_WHITELIST="PROJECT_A,PROJECT_B"
```

**プロジェクトキーとIDの混在**:
```bash
export BACKLOG_PROJECT_WHITELIST="PROJ1,12345,PROJ3"
```

**ホワイトリストを無効化**:
```bash
unset BACKLOG_PROJECT_WHITELIST  # 環境変数を削除
```

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

## 開発（実装完了後）

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

- API キーは環境変数またはワークスペース設定ファイルで管理
- ログ出力時に API キーを自動的にマスキング
- GET リクエストのみを使用し、データ変更は一切行わない
- 最小限の権限で Backlog API にアクセス
- プロジェクトホワイトリストによるアクセス制限（オプション）

## ライセンス

MIT License

## 貢献

Issue 報告や Pull Request を歓迎します。

## 注意事項

このツールは MIT ライセンスの下で提供され、保証や公式サポートはありません。
内容を確認し、用途に適しているかを判断した上で、自己責任でご利用ください。
問題が発生した場合は、GitHub Issues で報告してください。