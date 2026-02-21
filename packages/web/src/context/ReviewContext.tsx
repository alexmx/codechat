import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { Session, Comment, FileSummary, ClientMessage, ServerMessage } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';

export interface CommentDraft {
  filePath: string;
  line: number;
  endLine?: number;
  side: 'old' | 'new';
  body: string;
}

interface ReviewState {
  session: Session | null;
  isConnected: boolean;
  isSubmitted: boolean;
  activeDraft: CommentDraft | null;
}

type ReviewAction =
  | { type: 'INIT'; session: Session }
  | { type: 'COMMENT_ADDED'; comment: Comment }
  | { type: 'COMMENT_DELETED'; id: string }
  | { type: 'DIFF_UPDATED'; diff: string; files: FileSummary[] }
  | { type: 'REVIEW_COMPLETE' }
  | { type: 'CONNECTION_STATUS'; connected: boolean }
  | { type: 'START_DRAFT'; filePath: string; line: number; side: 'old' | 'new'; endLine?: number }
  | { type: 'UPDATE_DRAFT'; body: string }
  | { type: 'DISCARD_DRAFT' };

const initialState: ReviewState = {
  session: null,
  isConnected: false,
  isSubmitted: false,
  activeDraft: null,
};

function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case 'INIT':
      return { ...state, session: action.session };
    case 'COMMENT_ADDED':
      if (!state.session) return state;
      return {
        ...state,
        activeDraft: null,
        session: {
          ...state.session,
          comments: [...state.session.comments, action.comment],
        },
      };
    case 'COMMENT_DELETED':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          comments: state.session.comments.filter((c) => c.id !== action.id),
        },
      };
    case 'DIFF_UPDATED':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          diff: action.diff,
          files: action.files,
        },
      };
    case 'REVIEW_COMPLETE':
      return { ...state, isSubmitted: true };
    case 'CONNECTION_STATUS':
      return { ...state, isConnected: action.connected };
    case 'START_DRAFT':
      return {
        ...state,
        activeDraft: {
          filePath: action.filePath,
          line: action.line,
          ...(action.endLine ? { endLine: action.endLine } : {}),
          side: action.side,
          body: '',
        },
      };
    case 'UPDATE_DRAFT':
      if (!state.activeDraft) return state;
      return { ...state, activeDraft: { ...state.activeDraft, body: action.body } };
    case 'DISCARD_DRAFT':
      return { ...state, activeDraft: null };
    default:
      return state;
  }
}

interface ReviewContextValue {
  state: ReviewState;
  send: (msg: ClientMessage) => void;
  startDraft: (filePath: string, line: number, side: 'old' | 'new', endLine?: number) => void;
  updateDraft: (body: string) => void;
  discardDraft: () => void;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reviewReducer, initialState);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'init':
        dispatch({ type: 'INIT', session: msg.data });
        break;
      case 'comment_added':
        dispatch({ type: 'COMMENT_ADDED', comment: msg.data });
        break;
      case 'comment_deleted':
        dispatch({ type: 'COMMENT_DELETED', id: msg.data.id });
        break;
      case 'diff_updated':
        dispatch({ type: 'DIFF_UPDATED', diff: msg.data.diff, files: msg.data.files });
        break;
      case 'review_complete':
        dispatch({ type: 'REVIEW_COMPLETE' });
        setTimeout(() => window.close(), 500);
        break;
    }
  }, []);

  const { send, status } = useWebSocket(handleMessage);

  useEffect(() => {
    dispatch({ type: 'CONNECTION_STATUS', connected: status === 'connected' });
  }, [status]);

  const startDraft = useCallback((filePath: string, line: number, side: 'old' | 'new', endLine?: number) => {
    dispatch({ type: 'START_DRAFT', filePath, line, side, endLine });
  }, []);

  const updateDraft = useCallback((body: string) => {
    dispatch({ type: 'UPDATE_DRAFT', body });
  }, []);

  const discardDraft = useCallback(() => {
    dispatch({ type: 'DISCARD_DRAFT' });
  }, []);

  return (
    <ReviewContext.Provider value={{ state, send, startDraft, updateDraft, discardDraft }}>
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview() {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error('useReview must be used within ReviewProvider');
  return ctx;
}
