import { useReview } from '../context/ReviewContext';
import type { Comment } from '../types';

interface CommentWidgetProps {
  comments: Comment[];
  onReply: () => void;
}

export function CommentWidget({ comments, onReply }: CommentWidgetProps) {
  const { send } = useReview();

  function handleDelete(id: string) {
    send({ type: 'delete_comment', data: { id } });
  }

  if (comments.length === 0) return null;

  return (
    <div
      className="my-2 rounded-md"
      style={{ backgroundColor: 'var(--color-page-bg)', border: '1px solid var(--color-border-default)' }}
    >
      {comments.map((comment, i) => (
        <div
          key={comment.id}
          className="px-4 py-3"
          style={{
            ...(i > 0 ? { borderTop: '1px solid var(--color-border-separator)' } : {}),
            ...(comment.resolved ? { opacity: 0.5 } : {}),
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {comment.resolved && (
                <span
                  className="mb-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--color-success)',
                    color: 'var(--color-text-on-emphasis)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                  </svg>
                  Resolved
                </span>
              )}
              <p
                className="whitespace-pre-wrap text-sm"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {comment.body}
              </p>
            </div>
            {!comment.resolved && (
              <button
                onClick={() => handleDelete(comment.id)}
                className="shrink-0 rounded p-1"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                title="Delete comment"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.15l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z" />
                </svg>
              </button>
            )}
          </div>
          <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {new Date(comment.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ))}
      <div className="px-4 py-2" style={{ borderTop: '1px solid var(--color-border-separator)' }}>
        <button
          onClick={onReply}
          className="text-xs font-medium"
          style={{ color: 'var(--color-link)' }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          Reply
        </button>
      </div>
    </div>
  );
}
