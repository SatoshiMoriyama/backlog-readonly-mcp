/**
 * WhitelistManagerのテスト
 */

import { describe, expect, it } from 'vitest';
import { WhitelistManager } from '../src/config/whitelist-manager.js';
import type { BacklogProject } from '../src/types/index.js';

describe('WhitelistManager', () => {
  describe('constructor', () => {
    it('ホワイトリスト設定がある場合は有効化される', () => {
      const manager = new WhitelistManager(['PROJ1', 'PROJ2']);
      expect(manager.isWhitelistEnabled()).toBe(true);
    });

    it('ホワイトリスト設定が空配列の場合は無効化される', () => {
      const manager = new WhitelistManager([]);
      expect(manager.isWhitelistEnabled()).toBe(false);
    });

    it('ホワイトリスト設定がundefinedの場合は無効化される', () => {
      const manager = new WhitelistManager(undefined);
      expect(manager.isWhitelistEnabled()).toBe(false);
    });
  });

  describe('validateProjectAccess', () => {
    it('ホワイトリスト無効時はすべてのプロジェクトを許可する', () => {
      const manager = new WhitelistManager();
      expect(manager.validateProjectAccess('PROJ1')).toBe(true);
      expect(manager.validateProjectAccess('PROJ2')).toBe(true);
      expect(manager.validateProjectAccess('12345')).toBe(true);
    });

    it('プロジェクトキーがホワイトリストに含まれている場合は許可する', () => {
      const manager = new WhitelistManager(['PROJ1', 'PROJ2']);
      expect(manager.validateProjectAccess('PROJ1')).toBe(true);
      expect(manager.validateProjectAccess('PROJ2')).toBe(true);
    });

    it('プロジェクトIDがホワイトリストに含まれている場合は許可する', () => {
      const manager = new WhitelistManager(['12345', '67890']);
      expect(manager.validateProjectAccess('12345')).toBe(true);
      expect(manager.validateProjectAccess('67890')).toBe(true);
    });

    it('プロジェクトキーとIDが混在しているホワイトリストで正しく検証する', () => {
      const manager = new WhitelistManager(['PROJ1', '12345', 'PROJ2']);
      expect(manager.validateProjectAccess('PROJ1')).toBe(true);
      expect(manager.validateProjectAccess('12345')).toBe(true);
      expect(manager.validateProjectAccess('PROJ2')).toBe(true);
    });

    it('ホワイトリストに含まれていない場合は拒否する', () => {
      const manager = new WhitelistManager(['PROJ1', 'PROJ2']);
      expect(manager.validateProjectAccess('PROJ3')).toBe(false);
      expect(manager.validateProjectAccess('99999')).toBe(false);
    });
  });

  describe('filterProjects', () => {
    const mockProjects: BacklogProject[] = [
      {
        id: 1,
        projectKey: 'PROJ1',
        name: 'Project 1',
        chartEnabled: true,
        subtaskingEnabled: true,
        projectLeaderCanEditProjectLeader: false,
        useWikiTreeView: true,
        textFormattingRule: 'markdown',
        archived: false,
        displayOrder: 1,
        useDevAttributes: false,
      },
      {
        id: 2,
        projectKey: 'PROJ2',
        name: 'Project 2',
        chartEnabled: true,
        subtaskingEnabled: true,
        projectLeaderCanEditProjectLeader: false,
        useWikiTreeView: true,
        textFormattingRule: 'markdown',
        archived: false,
        displayOrder: 2,
        useDevAttributes: false,
      },
      {
        id: 3,
        projectKey: 'PROJ3',
        name: 'Project 3',
        chartEnabled: true,
        subtaskingEnabled: true,
        projectLeaderCanEditProjectLeader: false,
        useWikiTreeView: true,
        textFormattingRule: 'markdown',
        archived: false,
        displayOrder: 3,
        useDevAttributes: false,
      },
    ];

    it('ホワイトリスト無効時はすべてのプロジェクトを返す', () => {
      const manager = new WhitelistManager();
      const filtered = manager.filterProjects(mockProjects);
      expect(filtered).toEqual(mockProjects);
      expect(filtered.length).toBe(3);
    });

    it('プロジェクトキーでフィルタリングする', () => {
      const manager = new WhitelistManager(['PROJ1', 'PROJ3']);
      const filtered = manager.filterProjects(mockProjects);
      expect(filtered.length).toBe(2);
      expect(filtered[0].projectKey).toBe('PROJ1');
      expect(filtered[1].projectKey).toBe('PROJ3');
    });

    it('プロジェクトIDでフィルタリングする', () => {
      const manager = new WhitelistManager(['1', '3']);
      const filtered = manager.filterProjects(mockProjects);
      expect(filtered.length).toBe(2);
      expect(filtered[0].id).toBe(1);
      expect(filtered[1].id).toBe(3);
    });

    it('プロジェクトキーとIDが混在したホワイトリストでフィルタリングする', () => {
      const manager = new WhitelistManager(['PROJ1', '3']);
      const filtered = manager.filterProjects(mockProjects);
      expect(filtered.length).toBe(2);
      expect(filtered[0].projectKey).toBe('PROJ1');
      expect(filtered[1].id).toBe(3);
    });

    it('ホワイトリストに一致するプロジェクトがない場合は空配列を返す', () => {
      const manager = new WhitelistManager(['NONEXISTENT']);
      const filtered = manager.filterProjects(mockProjects);
      expect(filtered.length).toBe(0);
    });
  });

  describe('createAccessDeniedMessage', () => {
    it('プロジェクトIDを含むエラーメッセージを生成する', () => {
      const manager = new WhitelistManager(['PROJ1']);
      const message = manager.createAccessDeniedMessage('PROJ2');
      expect(message).toContain('PROJ2');
      expect(message).toContain('アクセスは許可されていません');
      expect(message).toContain('ホワイトリストに含まれていません');
      expect(message).toContain('BACKLOG_PROJECT_WHITELIST');
    });

    it('設定方法のヒントを含む', () => {
      const manager = new WhitelistManager(['PROJ1']);
      const message = manager.createAccessDeniedMessage('PROJ2');
      expect(message).toContain('例:');
      expect(message).toContain('BACKLOG_PROJECT_WHITELIST');
    });
  });

  describe('getWhitelistContent', () => {
    it('ホワイトリストが有効な場合は内容を返す', () => {
      const manager = new WhitelistManager(['PROJ1', 'PROJ2', '12345']);
      const content = manager.getWhitelistContent();
      expect(content).toEqual(['PROJ1', 'PROJ2', '12345']);
    });

    it('ホワイトリストが無効な場合はnullを返す', () => {
      const manager = new WhitelistManager();
      const content = manager.getWhitelistContent();
      expect(content).toBeNull();
    });
  });
});
