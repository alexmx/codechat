import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { Session, Comment, ClientMessage, ServerMessage } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';

interface ReviewState {
  session: Session | null;
  isConnected: boolean;
  isSubmitted: boolean;
}

type ReviewAction =
  | { type: 'INIT'; session: Session }
  | { type: 'COMMENT_ADDED'; comment: Comment }
  | { type: 'COMMENT_DELETED'; id: string }
  | { type: 'REVIEW_COMPLETE' }
  | { type: 'CONNECTION_STATUS'; connected: boolean };

const initialState: ReviewState = {
  session: null,
  isConnected: false,
  isSubmitted: false,
};

function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case 'INIT':
      return { ...state, session: action.session };
    case 'COMMENT_ADDED':
      if (!state.session) return state;
      return {
        ...state,
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
    case 'REVIEW_COMPLETE':
      return { ...state, isSubmitted: true };
    case 'CONNECTION_STATUS':
      return { ...state, isConnected: action.connected };
    default:
      return state;
  }
}

interface ReviewContextValue {
  state: ReviewState;
  send: (msg: ClientMessage) => void;
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

  return (
    <ReviewContext.Provider value={{ state, send }}>
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview() {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error('useReview must be used within ReviewProvider');
  return ctx;
}
