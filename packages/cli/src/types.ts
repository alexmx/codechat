export interface Session {
  id: string;
  repoPath: string;
  createdAt: string;
  updatedAt: string;
  reviews: Review[];
}

export interface Review {
  id: string;
  sessionId: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'changes_requested';
  diff: string;
  files: FileSummary[];
  comments: Comment[];
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
  side: 'old' | 'new';
  body: string;
  createdAt: string;
}

export interface ReviewResult {
  sessionId: string;
  reviewId: string;
  status: 'approved' | 'changes_requested';
  comments: Comment[];
}

export interface ReviewServer {
  port: number;
  url: string;
  result: Promise<ReviewResult>;
}

// WebSocket protocol

export type ServerMessage =
  | { type: 'init'; data: Review }
  | { type: 'comment_added'; data: Comment }
  | { type: 'comment_deleted'; data: { id: string } }
  | { type: 'review_complete' };

export type ClientMessage =
  | { type: 'add_comment'; data: Omit<Comment, 'id' | 'createdAt'> }
  | { type: 'delete_comment'; data: { id: string } }
  | { type: 'submit_review' };
