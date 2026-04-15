# backlog-readonly-mcp v0.2.0 をリリースしました（アクティビティ取得・ホワイトリスト機能追加）

## はじめに

以前公開した Backlog の読み取り専用 MCP「backlog-readonly-mcp」の v0.2.0 をリリースしました！

https://github.com/SatoshiMoriyama/backlog-readonly-mcp/releases/tag/v0.2.0

前回の記事では MCP 本体の基本機能をご紹介しましたが、今回のアップデートではアクティビティ取得機能とプロジェクトホワイトリスト機能を新たに追加しています。

https://qiita.com/s_moriyama/items/1ed558a637138cd1a2da

### この記事で学べること

- backlog-readonly-mcp v0.2.0 で追加されたアクティビティ取得機能の使い方
- プロジェクトホワイトリスト機能の設定方法

## 今回のアップデート

v0.2.0 の変更点は大きく 3 つです。順番に紹介していきます。

1. アクティビティ取得機能追加
1. プロジェクトホワイトリスト機能追加
1. get_resolutions 不具合対応

### アクティビティ取得機能追加

Backlog のアクティビティ（課題の更新・コメント・Wiki 編集など）を取得できる 3 つのツールを追加しました。

| ツール名 | 説明 |
| --- | --- |
| `get_space_activities` | スペース全体（全プロジェクト横断）のアクティビティを取得 |
| `get_project_activities` | 特定プロジェクトのアクティビティを取得 |
| `get_user_activities` | 特定ユーザーのアクティビティを取得 |

「最近このプロジェクトで何が更新された？」「昨日私はどんな作業をしていた？」といった確認が、MCP 経由で簡単にできるようになります。

3 つのツールはどれも同じパラメータ構成になっています。

```typescript:activity-params.ts
{
  activityTypeId?: number[];     // アクティビティ種別フィルタ（後述）
  minId?: number;                // この ID 以降のアクティビティを取得
  maxId?: number;                // この ID 以前のアクティビティを取得
  count?: number;                // 取得件数（デフォルト 20、最大 100）
  order?: 'asc' | 'desc';
  since?: string;                // 開始日時（YYYY-MM-DD または YYYY-MM-DDTHH:mm:ss）
  until?: string;                // 終了日時
}
```

なお、`get_project_activities` は `projectIdOrKey` を省略するとデフォルトプロジェクトを対象にします。

`activityTypeId` には 26 種類のアクティビティ種別を絞り込み指定できます。課題追加（1）・課題更新（2）・コメント追加（3）・Wiki 追加（5）・Git プッシュ（12）・プルリクエスト追加（18）などです。

種別を絞らない場合はすべてのアクティビティが返ってきます。

詳しいパラメータは下記公式ページをご確認ください。

https://developer.nulab.com/ja/docs/backlog/api/2/get-recent-updates/

また、公式 API には存在しない、`since` / `until` パラメータも設けていて、「昨日分」といったフィルタが可能です。

タイムスタンプに関しても MCP 側で UTC から JST（+09:00）に変換して返却するようにしているので、日本時間でそのまま扱えます。

::: note info

ただし `since` / `until` は Backlog API 側の機能ではなく、取得後に MCP 側でフィルタリングする実装です。

API から最新 `count` 件を取得したあとに日付で絞り込むため、取得した件数がすべて指定期間外なら結果は 0 件になります。`count` を最大の 100 に増やすのが手軽な対策ですが、それでも届かない古い期間は `minId` / `maxId` でページネーションを活用してください。

`minId` / `maxId` に指定する ID は、小さい値ほど古いアクティビティを取得できます。存在しない値を指定しても問題ありません。

:::

### プロジェクトホワイトリスト機能追加

新たに環境変数 `BACKLOG_PROJECT_WHITELIST` を追加しました。

複数プロジェクトが存在するスペースで MCP を使っている場合、これまではエージェントがすべてのプロジェクトにアクセスできる状態でした。ホワイトリストを設定することで、特定のプロジェクトだけに絞れるようになります。

`.backlog-mcp.env` への設定はこんな感じです。

```bash:.backlog-mcp.env
BACKLOG_DOMAIN=your-company.backlog.com
BACKLOG_API_KEY=your-api-key-here
BACKLOG_DEFAULT_PROJECT=MYPROJ
BACKLOG_PROJECT_WHITELIST=PROJ1,PROJ2,12345
```

カンマ区切りでプロジェクトキーと数値 ID を混在させて指定できます。どちらか一方で指定しておけば、もう一方でアクセスされた場合もホワイトリストチェックが正常に通ります。

ホワイトリストが有効な場合、次のように動作します。

- `get_projects` などスペース横断取得: ホワイトリスト内のプロジェクトのみ結果に含まれる
- `get_project` などプロジェクト個別取得: ホワイトリスト外を指定するとエラーを返す

::: note warn
`BACKLOG_DEFAULT_PROJECT` がホワイトリスト外のプロジェクトに設定されている場合、起動時にエラーが発生します。

:::

MCP の設定ファイルに直接記載する場合はこのように書きます。

```json
{
  "mcpServers": {
    "backlog-readonly": {
      "command": "npx",
      "args": ["-y", "backlog-readonly-mcp"],
      "env": {
        "BACKLOG_DOMAIN": "your-company.backlog.com",
        "BACKLOG_API_KEY": "your-api-key-here",
        "BACKLOG_DEFAULT_PROJECT": "MYPROJ",
        "BACKLOG_PROJECT_WHITELIST": "PROJ1,PROJ2"
      }
    }
  }
}
```

ホワイトリストを設定しない場合は、これまで通りすべてのプロジェクトにアクセスできます。

### get_resolutions 不具合対応

こちらは不具合改修です。

v0.1.x では `get_resolutions` ツール（完了理由の一覧取得）を呼び出すと「API エンドポイントが存在しない」エラーが発生していました。

API エンドポイントの指定が間違っていたので、修正しました。

## まとめ

backlog-readonly-mcp v0.2.0 の更新内容をご紹介しました。

- アクティビティ取得ツールを 3 つ追加（`get_space_activities`・`get_project_activities`・`get_user_activities`）
- `BACKLOG_PROJECT_WHITELIST` でアクセス可能なプロジェクトを制限できるようになった
- `get_resolutions` のエンドポイント誤りを修正

アクティビティ取得機能を使うと「最近このプロジェクトで何があった？」という確認がエージェント経由でできるようになり、昨日の振り返りなどに便利です！

引き続き機能追加や改善を進めていく予定です。気になった点があれば Issue や PR をいただけると嬉しいです。

https://github.com/SatoshiMoriyama/backlog-readonly-mcp

誰かのお役に立てると幸いです〜。
