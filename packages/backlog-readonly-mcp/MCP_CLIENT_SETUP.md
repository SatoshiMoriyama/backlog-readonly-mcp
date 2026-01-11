# MCPクライアント設定ガイド

このドキュメントでは、各種MCPクライアントでBacklog読み取り専用MCPサーバーを設定する方法を説明します。

## 共通の前提条件

1. Backlog読み取り専用MCPサーバーがインストール済み
2. プロジェクトルートに `.backlog-mcp.env` ファイルが設定済み
3. 各MCPクライアントが最新版にアップデート済み

## Claude Desktop

### 設定ファイルの場所

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### 設定例

```json
{
  "mcpServers": {
    "backlog-readonly": {
      "command": "backlog-readonly-mcp",
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 複数プロジェクト対応

```json
{
  "mcpServers": {
    "backlog-project-a": {
      "command": "backlog-readonly-mcp",
      "cwd": "/path/to/project-a"
    },
    "backlog-project-b": {
      "command": "backlog-readonly-mcp", 
      "cwd": "/path/to/project-b"
    }
  }
}
```

## Cline (VS Code Extension)

### 設定ファイルの場所

プロジェクトルートの `.vscode/settings.json`

### 設定例

```json
{
  "cline.mcpServers": {
    "backlog-readonly": {
      "command": "backlog-readonly-mcp",
      "cwd": "${workspaceFolder}",
      "args": [],
      "env": {}
    }
  }
}
```

### ワークスペース設定

```json
{
  "folders": [
    {
      "path": "./project-a"
    },
    {
      "path": "./project-b"
    }
  ],
  "settings": {
    "cline.mcpServers": {
      "backlog-project-a": {
        "command": "backlog-readonly-mcp",
        "cwd": "${workspaceFolder}/project-a"
      },
      "backlog-project-b": {
        "command": "backlog-readonly-mcp",
        "cwd": "${workspaceFolder}/project-b"
      }
    }
  }
}
```

## Cursor

### 設定ファイルの場所

プロジェクトルートの `.cursor/mcp.json`

### 設定例

```json
{
  "mcpServers": {
    "backlog-readonly": {
      "command": "backlog-readonly-mcp",
      "cwd": "${workspaceFolder}",
      "timeout": 30000
    }
  }
}
```

### 高度な設定

```json
{
  "mcpServers": {
    "backlog-readonly": {
      "command": "backlog-readonly-mcp",
      "cwd": "${workspaceFolder}",
      "timeout": 30000,
      "env": {
        "DEBUG": "backlog-mcp:*"
      },
      "restart": {
        "onConfigChange": true,
        "maxRetries": 3
      }
    }
  }
}
```

## 汎用MCP設定

### Node.js環境での直接実行

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

const client = new Client(
  {
    name: 'backlog-client',
    version: '1.0.0',
  },
  {
    capabilities: {},
  }
);

const serverProcess = spawn('backlog-readonly-mcp', [], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'inherit'],
});

const transport = new StdioClientTransport({
  readable: serverProcess.stdout,
  writable: serverProcess.stdin,
});

await client.connect(transport);
```

### Docker環境での使用

```dockerfile
FROM node:18-alpine

WORKDIR /app

# MCPサーバーのインストール
RUN npm install -g backlog-readonly-mcp

# 設定ファイルのコピー
COPY .backlog-mcp.env .

# MCPクライアントの起動
CMD ["backlog-readonly-mcp"]
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. サーバーが起動しない

**症状**: MCPクライアントでサーバーが認識されない

**確認事項**:
- `backlog-readonly-mcp` コマンドがPATHに含まれているか
- `.backlog-mcp.env` ファイルが正しい場所にあるか
- 設定ファイルの構文が正しいか

**解決方法**:
```bash
# コマンドの存在確認
which backlog-readonly-mcp

# 手動実行テスト
backlog-readonly-mcp

# 設定ファイルの確認
cat .backlog-mcp.env
```

#### 2. 認証エラー

**症状**: "APIキーが無効です" エラー

**確認事項**:
- `BACKLOG_API_KEY` が正しく設定されているか
- `BACKLOG_DOMAIN` が正しいか（https://は不要）
- APIキーの権限が適切か

#### 3. プロジェクトが見つからない

**症状**: "プロジェクトが見つかりません" エラー

**確認事項**:
- `BACKLOG_DEFAULT_PROJECT` の値が正しいか
- プロジェクトキーの大文字小文字が正確か
- APIキーでそのプロジェクトにアクセス可能か

### デバッグモード

詳細なログを確認したい場合：

```json
{
  "mcpServers": {
    "backlog-readonly": {
      "command": "backlog-readonly-mcp",
      "cwd": "${workspaceFolder}",
      "env": {
        "DEBUG": "backlog-mcp:*",
        "NODE_ENV": "development"
      }
    }
  }
}
```

### パフォーマンス調整

大量のデータを扱う場合：

```json
{
  "mcpServers": {
    "backlog-readonly": {
      "command": "backlog-readonly-mcp",
      "cwd": "${workspaceFolder}",
      "env": {
        "BACKLOG_TIMEOUT": "60000",
        "BACKLOG_MAX_RETRIES": "5"
      },
      "timeout": 60000
    }
  }
}
```

## セキュリティ考慮事項

### APIキーの管理

1. **環境変数の使用**: システム環境変数よりもワークスペース設定を優先
2. **ファイル権限**: `.backlog-mcp.env` ファイルの権限を適切に設定
3. **バージョン管理**: APIキーをGitにコミットしない

```bash
# ファイル権限の設定
chmod 600 .backlog-mcp.env

# .gitignoreに追加
echo ".backlog-mcp.env" >> .gitignore
```

### ネットワークセキュリティ

1. **HTTPS通信**: Backlog APIとの通信は常にHTTPS
2. **プロキシ対応**: 企業環境でのプロキシ設定

```bash
# プロキシ環境での設定
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

## 参考リンク

- [MCP プロトコル仕様](https://modelcontextprotocol.io/)
- [Backlog API ドキュメント](https://developer.nulab.com/docs/backlog/)
- [Claude Desktop 設定ガイド](https://claude.ai/docs)
- [VS Code Cline 拡張機能](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev)