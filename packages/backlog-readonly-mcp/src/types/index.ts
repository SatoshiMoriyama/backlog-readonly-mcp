/**
 * Backlog読み取り専用MCPサーバーの型定義
 */

// 設定関連の型
export interface BacklogConfig {
  /** Backlogドメイン (例: your-company.backlog.com) */
  domain: string;
  /** APIキー */
  apiKey: string;
  /** デフォルトプロジェクトキー (オプション) */
  defaultProject?: string;
  /** リトライ回数 */
  maxRetries: number;
  /** タイムアウト（ミリ秒） */
  timeout: number;
}

// Backlog API レスポンス型
export interface BacklogProject {
  id: number;
  projectKey: string;
  name: string;
  chartEnabled: boolean;
  subtaskingEnabled: boolean;
  projectLeaderCanEditProjectLeader: boolean;
  useWikiTreeView: boolean;
  textFormattingRule: string;
  archived: boolean;
  displayOrder: number;
  useDevAttributes: boolean;
}

export interface BacklogUser {
  id: number;
  userId: string;
  name: string;
  roleType: number;
  lang: string;
  mailAddress: string;
  nulabAccount?: {
    nulabId: string;
    name: string;
    uniqueId: string;
  };
}

export interface BacklogIssue {
  id: number;
  projectId: number;
  issueKey: string;
  keyId: number;
  issueType: IssueType;
  summary: string;
  description: string;
  resolution: Resolution | null;
  priority: Priority;
  status: Status;
  assignee: BacklogUser | null;
  category: Category[];
  versions: Version[];
  milestone: Milestone[];
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  parentIssueId: number | null;
  createdUser: BacklogUser;
  created: string;
  updatedUser: BacklogUser;
  updated: string;
  customFields: CustomField[];
  attachments: Attachment[];
  sharedFiles: SharedFile[];
  stars: Star[];
}

export interface IssueType {
  id: number;
  projectId: number;
  name: string;
  color: string;
  displayOrder: number;
}

export interface Resolution {
  id: number;
  name: string;
}

export interface Priority {
  id: number;
  name: string;
}

export interface Status {
  id: number;
  projectId: number;
  name: string;
  color: string;
  displayOrder: number;
}

export interface Category {
  id: number;
  name: string;
  displayOrder: number;
}

export interface Version {
  id: number;
  projectId: number;
  name: string;
  description: string;
  startDate: string | null;
  releaseDueDate: string | null;
  archived: boolean;
  displayOrder: number;
}

export interface Milestone {
  id: number;
  projectId: number;
  name: string;
  description: string;
  startDate: string | null;
  releaseDueDate: string | null;
  archived: boolean;
  displayOrder: number;
}

export interface CustomField {
  id: number;
  typeId: number;
  name: string;
  description: string;
  required: boolean;
  applicableIssueTypes: number[];
  allowAddItem: boolean;
  items: CustomFieldItem[];
  value?: string | number | string[] | number[] | null;
}

export interface CustomFieldItem {
  id: number;
  name: string;
  displayOrder: number;
}

export interface Attachment {
  id: number;
  name: string;
  size: number;
  createdUser: BacklogUser;
  created: string;
}

export interface SharedFile {
  id: number;
  type: string;
  dir: string;
  name: string;
  size: number;
  createdUser: BacklogUser;
  created: string;
  updatedUser: BacklogUser;
  updated: string;
}

export interface Star {
  id: number;
  comment: string | null;
  url: string;
  title: string;
  presenter: BacklogUser;
  created: string;
}

export interface BacklogComment {
  id: number;
  content: string;
  changeLog: ChangeLog[];
  createdUser: BacklogUser;
  created: string;
  updated: string;
  stars: Star[];
  notifications: Notification[];
}

export interface ChangeLog {
  field: string;
  newValue: string;
  originalValue: string;
}

export interface Notification {
  id: number;
  alreadyRead: boolean;
  reason: number;
  user: BacklogUser;
  resourceAlreadyRead: boolean;
}

export interface BacklogWiki {
  id: number;
  projectId: number;
  name: string;
  content: string;
  tags: WikiTag[];
  attachments: Attachment[];
  sharedFiles: SharedFile[];
  stars: Star[];
  createdUser: BacklogUser;
  created: string;
  updatedUser: BacklogUser;
  updated: string;
}

export interface WikiTag {
  id: number;
  name: string;
}

// エラー関連の型
export interface BacklogError {
  code: string;
  message: string;
  details?: unknown;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * シンプルな JSON Schema 型定義
 *
 * - 学習用・検証用のため、よく使うプロパティのみに絞っています
 * - 必要に応じてプロパティを拡張していく想定です
 */
export interface JSONSchema {
  type:
    | 'string'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'object'
    | 'array'
    | 'null';
  description?: string;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  enum?: Array<string | number | boolean | null>;
  required?: string[];
}

// ツール関連の型
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, JSONSchema>;
    required?: string[];
  };
}

export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}
