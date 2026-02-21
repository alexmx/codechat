import { useState } from 'react';
import { useReview } from '../context/ReviewContext';
import type { Comment } from '../types';

interface CommentWidgetProps {
  comments: Comment[];
  onReply: () => void;
}

export function CommentWidget({ comments, onReply }: CommentWidgetProps) {
  const { send } = useReview();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function handleDelete(id: string) {
    send({ type: 'delete_comment', data: { id } });
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
          style={i > 0 ? { borderTop: '1px solid var(--color-border-separator)' } : {}}
        >
          {comment.resolved && !expanded.has(comment.id) ? (
            <button
              onClick={() => toggleExpanded(comment.id)}
              className="flex w-full items-center gap-2 px-4 py-1.5 text-left"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <svg
                width="16" height="16" viewBox="0 0 16 16" fill="currentColor"
                style={{ color: 'var(--color-text-muted)', transform: 'rotate(-90deg)', transition: 'transform 0.15s' }}
              >
                <path d="M4.427 7.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z" />
              </svg>
              <span
                className="rounded px-1.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: 'var(--color-elevated-bg)', color: 'var(--color-text-muted)' }}
              >
                Resolved
              </span>
              <span
                className="truncate text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {comment.body}
              </span>
            </button>
          ) : (
            <div className="px-4 py-3">
              {comment.resolved && (
                <button
                  onClick={() => toggleExpanded(comment.id)}
                  className="mb-1 flex items-center gap-1"
                >
                  <svg
                    width="16" height="16" viewBox="0 0 16 16" fill="currentColor"
                    style={{ color: 'var(--color-text-muted)', transition: 'transform 0.15s' }}
                  >
                    <path d="M4.427 7.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z" />
                  </svg>
                  <span
                    className="rounded px-1.5 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: 'var(--color-elevated-bg)', color: 'var(--color-text-muted)' }}
                  >
                    Resolved
                  </span>
                </button>
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {comment.endLine && comment.endLine !== comment.line && (
                    <span
                      className="mb-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: 'var(--color-elevated-bg)', color: 'var(--color-text-muted)' }}
                    >
                      Lines {comment.line}&ndash;{comment.endLine}
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
              {comment.agentReply && (
                <div
                  className="mt-2 rounded px-3 py-2"
                  style={{
                    backgroundColor: 'var(--color-surface-bg)',
                    borderLeft: '2px solid var(--color-info)',
                  }}
                >
                  <span className="text-xs font-medium" style={{ color: 'var(--color-info)' }}>
                    Agent
                  </span>
                  <p
                    className="mt-0.5 whitespace-pre-wrap text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {comment.agentReply}
                  </p>
                </div>
              )}
            </div>
          )}
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
