# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-01-15

### Changed
- `get_wikis` を `get_recent_wikis` に変更し、最近閲覧した Wiki を取得する機能に改善 (#22)
- プロジェクト ID とキーワードによるクライアントサイドフィルタリング機能を追加

### Fixed
- MCP サーバー初期化ログが Kiro MCP Logs ビューに表示されるように修正 (#23)
- `console.log/error/warn` から `process.stderr.write` に変更
- FASTMCP_LOG_LEVEL 環境変数のサポート追加

### Added
- README の設定方法を改善し、デバッグログを追加 (#24)
- 3 つの設定方法を明確に分類（直接記載、環境変数参照、設定ファイル使用）
- カレントディレクトリと設定ファイルパスのデバッグログ出力

## [0.1.1] - 2026-01-12

### Security
- @modelcontextprotocol/sdk を 1.0.0 → 1.25.2 に更新（ReDoS 脆弱性修正）
- vitest を 2.0.0 → 4.0.16 に更新（esbuild 脆弱性修正）
- qs の間接依存関係の脆弱性を修正

### Added
- Initial release
- Backlog API 読み取り専用 MCP サーバー
- プロジェクト、課題、Wiki、ユーザー情報の取得機能
- 環境変数による設定（BACKLOG_SPACE_KEY, BACKLOG_API_KEY, BACKLOG_DEFAULT_PROJECT_KEY）

[Unreleased]: https://github.com/SatoshiMoriyama/backlog-readonly-mcp/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/SatoshiMoriyama/backlog-readonly-mcp/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/SatoshiMoriyama/backlog-readonly-mcp/releases/tag/v0.1.1
