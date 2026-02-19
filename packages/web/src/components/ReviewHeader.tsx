import { useState } from 'react';
import { useReview } from '../context/ReviewContext';
import { useTheme } from '../hooks/useTheme';
import { SubmitDialog } from './SubmitDialog';

export function ReviewHeader() {
  const { state } = useReview();
  const { theme, toggleTheme } = useTheme();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  if (!state.review) return null;

  const { review } = state;
  const totalAdditions = review.files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = review.files.reduce((sum, f) => sum + f.deletions, 0);

  return (
    <>
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: 'var(--color-deep-bg)', borderBottom: '1px solid var(--color-border-separator)' }}
      >
        <div className="flex items-center gap-4">
          <span className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            CodeChat
          </span>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {review.files.length} file{review.files.length !== 1 ? 's' : ''} changed
          </span>
          <span className="text-sm font-mono" style={{ color: 'var(--color-success)' }}>
            +{totalAdditions}
          </span>
          <span className="text-sm font-mono" style={{ color: 'var(--color-danger)' }}>
            -{totalDeletions}
          </span>
          {review.comments.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: 'var(--color-info)', color: 'var(--color-text-on-emphasis)' }}
            >
              {review.comments.length} comment{review.comments.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="rounded p-1.5"
            style={{ color: 'var(--color-text-secondary)', backgroundColor: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="4"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Zm1.616 1.945a7 7 0 0 1-7.678 7.678 5.499 5.499 0 1 0 7.678-7.678Z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setShowSubmitDialog(true)}
            className="rounded-md px-4 py-1.5 text-sm font-medium"
            style={{ backgroundColor: 'var(--color-btn-green-bg)', color: 'var(--color-text-on-emphasis)', border: '1px solid var(--color-btn-border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-btn-green-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-btn-green-bg)')}
          >
            Review changes
          </button>
        </div>
      </header>
      {showSubmitDialog && (
        <SubmitDialog onClose={() => setShowSubmitDialog(false)} />
      )}
    </>
  );
}
