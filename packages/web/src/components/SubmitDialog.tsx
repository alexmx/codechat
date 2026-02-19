import { useReview } from '../context/ReviewContext';

interface SubmitDialogProps {
  onClose: () => void;
}

export function SubmitDialog({ onClose }: SubmitDialogProps) {
  const { state, send } = useReview();
  const commentCount = state.review?.comments.length ?? 0;

  function submit(status: 'approved' | 'changes_requested') {
    send({ type: 'submit_review', data: { status } });
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
            Finish your review
          </h2>
        </div>
        <div className="px-4 py-4">
          <p className="mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {commentCount > 0
              ? `${commentCount} pending comment${commentCount !== 1 ? 's' : ''}`
              : 'No comments added'}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => submit('approved')}
              className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: 'var(--color-btn-green-bg)', color: 'var(--color-text-on-emphasis)', border: '1px solid var(--color-btn-border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-btn-green-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-btn-green-bg)')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
              Approve
            </button>
            <button
              onClick={() => submit('changes_requested')}
              className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: 'var(--color-btn-red-bg)', color: 'var(--color-text-on-emphasis)', border: '1px solid var(--color-btn-border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-btn-red-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-btn-red-bg)')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.75 1h10.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 15H2.75A1.75 1.75 0 0 1 1 13.25V2.75C1 1.784 1.784 1 2.75 1Zm10.5 1.5H2.75a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25Z" />
              </svg>
              Request changes
            </button>
          </div>
        </div>
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--color-border-separator)' }}>
          <button
            onClick={onClose}
            className="w-full rounded-md px-4 py-1.5 text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-default)', backgroundColor: 'transparent' }}
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
