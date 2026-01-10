# 要件文書

## 概要

BacklogのAPIを利用して、プロジェクト、課題、ユーザー情報などを参照できるMCP（Model Context Protocol）サーバーを開発する。このMCPサーバーは読み取り専用に特化し、データの変更や作成は一切行わない。既存のnulab公式MCPサーバーとは異なり、セキュリティを重視し、誤ってデータを変更するリスクを完全に排除する。

## 用語集

- **Backlog**: ヌーラボが提供するプロジェクト管理ツール
- **MCP_Server**: Model Context Protocolに準拠したサーバー
- **API_Client**: BacklogのREST APIにアクセスするクライアント
- **Project**: Backlogにおけるプロジェクト
- **Issue**: Backlogにおける課題
- **User**: Backlogのユーザー

## 要件

### 要件 1: API認証とアクセス

**ユーザーストーリー:** 開発者として、BacklogのAPIキーを使用してAPIにアクセスしたい。これにより、安全にBacklogのデータを取得できる。

#### 受け入れ基準

1. WHEN APIキーが提供されたとき、THE MCP_Server SHALL Backlog APIに対して認証を行う
2. WHEN 無効なAPIキーが提供されたとき、THE MCP_Server SHALL 適切なエラーメッセージを返す
3. WHEN API接続が失敗したとき、THE MCP_Server SHALL 接続エラーを適切に処理する
4. THE MCP_Server SHALL 環境変数またはコンフィグファイルからAPIキーを読み込む

### 要件 2: プロジェクト情報の取得

**ユーザーストーリー:** ユーザーとして、Backlogのプロジェクト一覧と詳細情報を取得したい。これにより、プロジェクトの概要を把握できる。

#### 受け入れ基準

1. WHEN プロジェクト一覧が要求されたとき、THE MCP_Server SHALL 利用可能なプロジェクトのリストを返す
2. WHEN 特定のプロジェクトIDが指定されたとき、THE MCP_Server SHALL そのプロジェクトの詳細情報を返す
3. WHEN 存在しないプロジェクトIDが指定されたとき、THE MCP_Server SHALL 適切なエラーメッセージを返す
4. THE MCP_Server SHALL プロジェクト名、キー、説明、作成日時を含む情報を提供する

### 要件 3: 課題情報の取得

**ユーザーストーリー:** ユーザーとして、Backlogの課題情報を検索・取得したい。これにより、プロジェクトの進捗状況を把握できる。

#### 受け入れ基準

1. WHEN 課題一覧が要求されたとき、THE MCP_Server SHALL プロジェクト内の課題リストを返す
2. WHEN 特定の課題IDが指定されたとき、THE MCP_Server SHALL その課題の詳細情報を返す
3. WHEN 課題検索条件が指定されたとき、THE MCP_Server SHALL 条件に合致する課題を返す
4. THE MCP_Server SHALL 課題のタイトル、説明、ステータス、担当者、期限を含む情報を提供する
5. WHEN 存在しない課題IDが指定されたとき、THE MCP_Server SHALL 適切なエラーメッセージを返す

### 要件 4: ユーザー情報の取得

**ユーザーストーリー:** ユーザーとして、Backlogのユーザー情報を取得したい。これにより、プロジェクトメンバーの情報を確認できる。

#### 受け入れ基準

1. WHEN ユーザー一覧が要求されたとき、THE MCP_Server SHALL プロジェクトのユーザーリストを返す
2. WHEN 特定のユーザーIDが指定されたとき、THE MCP_Server SHALL そのユーザーの詳細情報を返す
3. THE MCP_Server SHALL ユーザー名、表示名、メールアドレス、ロールを含む情報を提供する
4. WHEN 存在しないユーザーIDが指定されたとき、THE MCP_Server SHALL 適切なエラーメッセージを返す

### 要件 5: MCPプロトコル準拠

**ユーザーストーリー:** 開発者として、標準的なMCPクライアントからこのサーバーを利用したい。これにより、既存のMCPエコシステムと統合できる。

#### 受け入れ基準

1. THE MCP_Server SHALL MCPプロトコルの仕様に準拠する
2. WHEN MCPクライアントから接続要求があったとき、THE MCP_Server SHALL 適切なハンドシェイクを行う
3. THE MCP_Server SHALL 利用可能なツールのリストを提供する
4. WHEN ツールが呼び出されたとき、THE MCP_Server SHALL 適切なレスポンスを返す
5. THE MCP_Server SHALL エラー処理をMCPプロトコルに従って行う

### 要件 6: 読み取り専用制限

**ユーザーストーリー:** システム管理者として、このMCPサーバーがBacklogのデータを変更しないことを保証したい。これにより、安全にデータを参照できる。

#### 受け入れ基準

1. THE MCP_Server SHALL GET リクエストのみを使用してBacklog APIにアクセスする
2. THE MCP_Server SHALL POST、PUT、DELETE リクエストを一切送信しない
3. WHEN データ変更を要求するツール呼び出しがあったとき、THE MCP_Server SHALL エラーメッセージを返す
4. THE MCP_Server SHALL 読み取り専用であることをツールの説明に明記する

### 要件 7: エラーハンドリングとログ

**ユーザーストーリー:** 開発者として、APIエラーや接続問題を適切に処理・ログ出力したい。これにより、問題の診断と解決ができる。

#### 受け入れ基準

1. WHEN Backlog APIからエラーレスポンスが返されたとき、THE MCP_Server SHALL 適切なエラーメッセージを生成する
2. WHEN ネットワークエラーが発生したとき、THE MCP_Server SHALL 接続エラーを適切に処理する
3. THE MCP_Server SHALL 重要な操作とエラーをログに記録する
4. WHEN レート制限に達したとき、THE MCP_Server SHALL 適切な待機時間を設ける
5. THE MCP_Server SHALL ユーザーフレンドリーなエラーメッセージを提供する

### 要件 8: 既存MCPサーバーとの差別化

**ユーザーストーリー:** セキュリティ重視の環境で作業する開発者として、データ変更のリスクを完全に排除したBacklog MCPサーバーを使用したい。これにより、安心してAIエージェントにBacklogデータへのアクセスを許可できる。

#### 受け入れ基準

1. THE MCP_Server SHALL 公式MCPサーバーと比較して読み取り専用機能のみを提供する
2. THE MCP_Server SHALL データ変更機能（課題作成、コメント追加、Wiki編集など）を一切実装しない
3. WHEN データ変更を試みるツール呼び出しがあったとき、THE MCP_Server SHALL 明確な拒否メッセージを返す
4. THE MCP_Server SHALL セキュリティ重視の用途に適していることをドキュメントに明記する
5. THE MCP_Server SHALL 最小限の権限でBacklog APIにアクセスする

### 要件 9: 提供ツールの定義

**ユーザーストーリー:** 開発者として、MCPサーバーが提供する具体的なツールを把握したい。これにより、どのような操作が可能かを理解できる。

#### 受け入れ基準

1. THE MCP_Server SHALL 以下のプロジェクト関連ツールを提供する：
   - `get_projects`: プロジェクト一覧の取得
   - `get_project`: 特定プロジェクトの詳細取得
   - `get_project_users`: プロジェクトメンバー一覧の取得

2. THE MCP_Server SHALL 以下の課題関連ツールを提供する：
   - `get_issues`: 課題一覧の取得（検索条件付き）
   - `get_issue`: 特定課題の詳細取得
   - `get_issue_comments`: 課題のコメント一覧取得
   - `get_issue_attachments`: 課題の添付ファイル一覧取得

3. THE MCP_Server SHALL 以下のユーザー関連ツールを提供する：
   - `get_users`: ユーザー一覧の取得
   - `get_user`: 特定ユーザーの詳細取得
   - `get_myself`: 自分のユーザー情報取得

4. THE MCP_Server SHALL 以下のWiki関連ツールを提供する：
   - `get_wikis`: Wiki一覧の取得
   - `get_wiki`: 特定Wikiページの取得

5. THE MCP_Server SHALL 以下のマスタデータ関連ツールを提供する：
   - `get_priorities`: 優先度一覧の取得
   - `get_statuses`: ステータス一覧の取得
   - `get_resolutions`: 完了理由一覧の取得
   - `get_categories`: カテゴリ一覧の取得

6. WHEN 各ツールが呼び出されたとき、THE MCP_Server SHALL 適切なBacklog APIエンドポイントにGETリクエストを送信する

7. THE MCP_Server SHALL 各ツールの説明に「読み取り専用」であることを明記する