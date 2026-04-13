# 読み取り専用のBacklog MCPを作成しました

## はじめに

先日、いつもお世話になっている Backlog の読み取り専用の MCP を公開しました。

https://www.npmjs.com/package/backlog-readonly-mcp

個人的な事情で作った MCP なので、需要は低いとは思いますが、この記事では、この MCP の紹介したいと思います。

### この記事で学べること、対象

- 株式会社ヌーラボが提供している Backlog の MCP について
- 読み取りに限定した MCP サーバ欲しいな！　って思ってる人

### 前提知識・条件

- Backlog を利用している人が対象となります
- 今回は MCP サーバそのもののお話は省略させてください

## 作成の背景

まず、Backlog には公式の MCP サーバーがすでに存在しています。

https://github.com/nulab/backlog-mcp-server

Backlog を MCP で操作したいときははこの公式 MCP を利用することを最初に考えていただければ良いと思いますが、
この公式 MCP は利用するツールを制限できる機能はあるものの、制限単位は `space` や `project` などの機能単位となっており、読み取り専用に限定する機能は現時点では存在していないようです。

私は個人的な理由で MCP 経由で Backlog への書き込みを防ぎたいという思いがあったため、読み取り専用の MCP を作成することにしました。

もちろん、Backlog の設定を自由に変更できる環境であれば、参照権限のみを持つユーザーを作成し、そのユーザーで API キーで MCP を利用するのが最も簡単な方法です。

しかし、各種制約などでそれが難しい場合に、この読み取り専用 MCP が役立つかな、と考えています。

## 機能紹介

基本的な使い方は以下に掲載しています。

https://github.com/SatoshiMoriyama/backlog-readonly-mcp/tree/main/packages/backlog-readonly-mcp#readme

この記事では特徴的な機能を 3 つ紹介します。

### 1. 完全読み取り専用設計

今回は、機能フラグで読み取り専用へ制限するというわけではなく、完全な読み取り専用 MCP として作成されています。

例えば、Backlog API コール時には GET メソッド以外の利用を制御しています。

```typescript:backlog-api-client.ts
public async post(): Promise<never> {
  throw new ReadOnlyViolationError('このMCPサーバーは読み取り専用です。POSTリクエストは許可されていません。');
}

public async put(): Promise<never> {
  throw new ReadOnlyViolationError('このMCPサーバーは読み取り専用です。PUTリクエストは許可されていません。');
}

public async delete(): Promise<never> {
  throw new ReadOnlyViolationError('このMCPサーバーは読み取り専用です。DELETEリクエストは許可されていません。');
}
```

また、ツール登録時には、`create`,`edit` といった変更できそうな名前を禁止するような制限まで設けています（過剰な気もしますが...）

```typescript:tool-registry.ts
const WRITE_OPERATION_PATTERNS = [
  /^create/i,
  /^edit/i,
  /^modify/i,
  /^delete/i,
  /^remove/i,
  /^post/i,
  /^put/i,
  /^patch/i,
  /^upload/i,
  /^insert/i,
];
```

### ２. デフォルトプロジェクト機能

MCP を利用し Backlog を参照するシーンにおいて、特定の１つのプロジェクトのみを参照するシーンが多いのではと考えています。

こういったケースにおいて、MCP を利用するたびに対象のプロジェクトを指定しなくても良いようにデフォルトで利用するプロジェクトを指定する機能を設けました。

これを設定しておくことで、エージェントに操作対象のプロジェクトを指示する必要がなくなります。

### 3. ワークスペース固有設定のサポート

Backlog のコンテンツを API で操作するためには、対象のドメイン(`https://xxxx.backlog.jp`)や API キーを設定していく必要があります。

これらの設定を安全に設定したい、あるいは複数設定を保持できるために３つの設定方法を準備しています。

1. MCP の設定ファイルに直接記載
2. 環境変数
3. ワークスペースにある、`.backlog-mcp.env`

#### 1. MCPの設定ファイルに直接記載

基本となる、MCP の設定ファイルに直接記載する方法です。

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

最も簡単な方法ではありますが、ワークスペース単位で設定する場合は間違えて Git に Push したりしてしまうリスクがあるかなと感じています。

#### 2. 環境変数

次に環境変数を利用するケースです。

作業する PC に環境変数を設定しておくことで、Git に Push しても問題のない記載が可能です。

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

上記の例では、`${BACKLOG_DOMAIN}` と記載していますが、IDE ごとに環境変数を参照する記載方法が異なる場合があります。

上記の記載は kiro で動作確認してします。

また、Kiro の場合は以下の環境変数の読み取りを許するような設定が必要でした。

```json
  "approvedEnvironmentVariables": [
    "BACKLOG_DOMAIN",
    "BACKLOG_API_KEY",
    "BACKLOG_DEFAULT_PROJECT"
  ],
```

#### 3. ワークスペースにある、`.backlog-mcp.env`

次に、これらの設定を個別に変更するようなケースを想定し、`.backlog-mcp.env` から設定情報を取得する機能も設けています。

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

この設定は他の設定より優先されるため、特定のワークペースで作業している場合のみ、デフォルトプロジェクトの値を変更しておくなどを想定しています。

VS Code 限定？　の機能ではありますが `${workspaceFolder}` を使えば、今 IDE で開いているワークスペースフォルダを動的に指すことができるのでワークスペースごとの設定が可能になります。

https://code.visualstudio.com/docs/reference/variables-reference

ただし、kiro ではこの機能は使えませんでした。

## 開発について

今回は kiro の Specs の機能を利用して作成しています。

要件定義等は以下に格納しています。

https://github.com/SatoshiMoriyama/backlog-readonly-mcp/tree/main/.kiro/specs/backlog-readonly-mcp

またレビューには Github Copilot のレビュー機能を活用しています。

kiro が作成した Task 単位に PR を作成し、都度レビューをしてもらうようにしています。

https://github.com/SatoshiMoriyama/backlog-readonly-mcp/pull/3

とても開発体験は良いのですが、PR 作成からのレビュー指摘対応をもう少し自動化できるといいかなと感じています。

## まとめ

Backlog 読み取り専用の MCP のご紹介でした。

この MCP は継続的に保守していきますので、もし、何かお気づきの点があれば、気軽にで Issue 等を上げてくれると嬉しいです。

なお、作った後に気づいたのですが、公式ではないものの、ヌーラボ社員の方が Rust 版の MCP サーバも公開されており、こちらも同じく読み取り専用にできるみたいですので、紹介しておきます。

https://nulab.com/ja/blog/backlog/backlog-mcp-server-rust/
