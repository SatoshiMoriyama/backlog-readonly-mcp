# 技術ブログワークスペース

技術ブログ記事の執筆・校正とコード検証のためのワークスペースです。

## 使い方

### 新しいブログ記事の開始

1. このリポジトリをテンプレートとして新しいブログ用リポジトリを作成するか、ローカル環境でこのフォルダ全体を別の場所にコピーして新しい作業ディレクトリを作成

2. **GitHub Settings Appをインストール**（テンプレートから作成した場合）

   新しいリポジトリでPR設定を自動化するため、以下のURLからGitHub Settings Appをインストールしてください：
   
   ```
   https://github.com/apps/settings
   ```
   
   インストール後、`.github/settings.yml`の設定が自動的に適用され、以下が設定されます：
   - ブランチ保護ルール（レビューコメント解決必須）
   - マージ設定（Squash mergeのみ、マージ後ブランチ自動削除）
   - セキュリティ設定（自動修正とアラート有効）

3. 依存関係をインストール

3. 依存関係をインストール

```bash
pnpm install
```

4. セットアップスクリプトを実行

```bash
pnpm setup-blog your-blog-name
```

例:
```bash
pnpm setup-blog aws-lambda-tips
```

5. `blog_content/blog.md` を編集してブログを書く

### 利用可能なコマンド

```bash
# Markdownのlint
pnpm lint

# Markdownのlint（自動修正）
pnpm lint:fix

# コードのlint
pnpm code:lint

# コードのlint（自動修正）
pnpm code:fix

# CDKデプロイ
pnpm cdk:deploy

# CDKスタック削除
pnpm cdk:destroy
```

## 構成

- `blog_content/` - ブログ記事のMarkdownファイル
- `packages/cdk/` - AWS CDKプロジェクト（サンプルコード用）
- `.vscode/` - VSCode設定
- `.kiro/` - Kiro設定とフック
- `.github/settings.yml` - GitHub Settings App用の自動設定ファイル

## 注意事項

- セットアップスクリプトは以下を自動更新します：
  - ルート `package.json` の name と description
  - CDK プロジェクトの `packages/cdk/package.json` の name
  - Kiro Hook の workspaceFolderName