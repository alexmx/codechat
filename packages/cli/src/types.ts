export interface Session {
  id: string;
  repoPath: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'approved' | 'changes_requested';
  diff: string;
  files: FileSummary[];
  comments: Comment[];
  description?: string;
}

export interface FileSummary {
  path: string;
  oldPath?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
}

export interface Comment {
  id: string;
  filePath: string;
  line: number;
  endLine?: number;
  side: 'old' | 'new';
  body: string;
  createdAt: string;
  resolved: boolean;
  agentReply?: string;
}

export interface ReviewResult {
  sessionId: string;
  status: 'approved' | 'changes_requested';
  comments: Comment[];
  summary?: string;
}

export interface ReviewServer {
  port: number;
  url: string;
  result: Promise<ReviewResult>;
}

// WebSocket protocol

export type ServerMessage =
  | { type: 'init'; data: Session }
  | { type: 'comment_added'; data: Comment }
  | { type: 'comment_deleted'; data: { id: string } }
  | { type: 'diff_updated'; data: { diff: string; files: FileSummary[] } }
  | { type: 'review_complete' };

export type ClientMessage =
  | { type: 'add_comment'; data: Omit<Comment, 'id' | 'createdAt' | 'resolved'> }
  | { type: 'delete_comment'; data: { id: string } }
  | { type: 'submit_review'; data?: { summary?: string } };
