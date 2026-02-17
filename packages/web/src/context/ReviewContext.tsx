import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Review, Comment, ClientMessage, ServerMessage } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';

interface ReviewState {
  review: Review | null;
  isConnected: boolean;
  isSubmitted: boolean;
}

type ReviewAction =
  | { type: 'INIT'; review: Review }
  | { type: 'COMMENT_ADDED'; comment: Comment }
  | { type: 'COMMENT_DELETED'; id: string }
  | { type: 'REVIEW_COMPLETE' }
  | { type: 'CONNECTION_STATUS'; connected: boolean };

const initialState: ReviewState = {
  review: null,
  isConnected: false,
  isSubmitted: false,
};

function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case 'INIT':
      return { ...state, review: action.review };
    case 'COMMENT_ADDED':
      if (!state.review) return state;
      return {
        ...state,
        review: {
          ...state.review,
          comments: [...state.review.comments, action.comment],
        },
      };
    case 'COMMENT_DELETED':
      if (!state.review) return state;
      return {
        ...state,
        review: {
          ...state.review,
          comments: state.review.comments.filter((c) => c.id !== action.id),
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
  dispatch: React.Dispatch<ReviewAction>;
  send: (msg: ClientMessage) => void;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reviewReducer, initialState);
  const { send, lastMessage, status } = useWebSocket();

  useEffect(() => {
    dispatch({ type: 'CONNECTION_STATUS', connected: status === 'connected' });
  }, [status]);

  useEffect(() => {
    if (!lastMessage) return;
    const msg: ServerMessage = lastMessage;
    switch (msg.type) {
      case 'init':
        dispatch({ type: 'INIT', review: msg.data });
        break;
      case 'comment_added':
        dispatch({ type: 'COMMENT_ADDED', comment: msg.data });
        break;
      case 'comment_deleted':
        dispatch({ type: 'COMMENT_DELETED', id: msg.data.id });
        break;
      case 'review_complete':
        dispatch({ type: 'REVIEW_COMPLETE' });
        break;
    }
  }, [lastMessage]);

  return (
    <ReviewContext.Provider value={{ state, dispatch, send }}>
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview() {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error('useReview must be used within ReviewProvider');
  return ctx;
}
