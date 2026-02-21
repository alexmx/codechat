import { useReview } from '../context/ReviewContext';

interface SubmitDialogProps {
  onClose: () => void;
}

export function SubmitDialog({ onClose }: SubmitDialogProps) {
  const { state, send } = useReview();
  const comments = state.session?.comments ?? [];
  const pendingCount = comments.filter((c) => !c.resolved).length;
  const resolvedCount = comments.filter((c) => c.resolved).length;

  function submit() {
    send({ type: 'submit_review' });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-overlay-bg)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg p-0"
        style={{ backgroundColor: 'var(--color-page-bg)', border: '1px solid var(--color-border-default)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-separator)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Submit review
          </h2>
        </div>
        <div className="px-4 py-4">
          <p className="mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {pendingCount > 0
              ? `${pendingCount} new comment${pendingCount !== 1 ? 's' : ''} will be sent back to the agent.`
              : 'No new comments — this will approve the changes.'}
            {resolvedCount > 0 && (
              <span style={{ color: 'var(--color-text-muted)' }}>
                {' '}({resolvedCount} resolved from previous round{resolvedCount !== 1 ? 's' : ''})
              </span>
            )}
          </p>
          <button
            onClick={submit}
            className="flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--color-btn-green-bg)', color: 'var(--color-text-on-emphasis)', border: '1px solid var(--color-btn-border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-btn-green-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-btn-green-bg)')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
            </svg>
            Submit review
          </button>
        </div>
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--color-border-separator)' }}>
          <button
            onClick={onClose}
            className="w-full rounded-md px-4 py-1.5 text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-default)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
