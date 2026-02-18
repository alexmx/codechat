import { useState } from 'react';
import { useReview } from '../context/ReviewContext';
import { SubmitDialog } from './SubmitDialog';

export function ReviewHeader() {
  const { state } = useReview();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  if (!state.review) return null;

  const { review } = state;
  const totalAdditions = review.files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = review.files.reduce((sum, f) => sum + f.deletions, 0);

  return (
    <>
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: '#010409', borderBottom: '1px solid #21262d' }}
      >
        <div className="flex items-center gap-4">
          <span className="text-base font-semibold" style={{ color: '#e6edf3' }}>
            CodeChat
          </span>
          <span className="text-sm" style={{ color: '#8b949e' }}>
            {review.files.length} file{review.files.length !== 1 ? 's' : ''} changed
          </span>
          <span className="text-sm font-mono" style={{ color: '#3fb950' }}>
            +{totalAdditions}
          </span>
          <span className="text-sm font-mono" style={{ color: '#f85149' }}>
            -{totalDeletions}
          </span>
          {review.comments.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: '#1f6feb', color: '#ffffff' }}
            >
              {review.comments.length} comment{review.comments.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSubmitDialog(true)}
          className="rounded-md px-4 py-1.5 text-sm font-medium"
          style={{ backgroundColor: '#238636', color: '#ffffff', border: '1px solid rgba(240,246,252,0.1)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2ea043')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#238636')}
        >
          Review changes
        </button>
      </header>
      {showSubmitDialog && (
        <SubmitDialog onClose={() => setShowSubmitDialog(false)} />
      )}
    </>
  );
}
