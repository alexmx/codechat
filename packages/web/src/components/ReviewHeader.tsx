import { useState, useMemo, useEffect, useRef } from 'react';
import { useReview } from '../context/ReviewContext';
import { useTheme } from '../hooks/useTheme';
import { SubmitDialog } from './SubmitDialog';

export function ReviewHeader() {
  const { state } = useReview();
  const { theme, toggleTheme } = useTheme();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showDiffToast, setShowDiffToast] = useState(false);
  const prevDiffRef = useRef<string | undefined>();

  useEffect(() => {
    const currentDiff = state.session?.diff;
    if (prevDiffRef.current !== undefined && currentDiff !== prevDiffRef.current) {
      setShowDiffToast(true);
      const timer = setTimeout(() => setShowDiffToast(false), 3000);
      return () => clearTimeout(timer);
    }
    prevDiffRef.current = currentDiff;
  }, [state.session?.diff]);

  if (!state.session) return null;

  const { session } = state;
  const { totalAdditions, totalDeletions } = useMemo(() => ({
    totalAdditions: session.files.reduce((sum, f) => sum + f.additions, 0),
    totalDeletions: session.files.reduce((sum, f) => sum + f.deletions, 0),
  }), [session.files]);

  const pendingCount = session.comments.filter((c) => !c.resolved).length;

  return (
    <>
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: 'var(--color-deep-bg)', borderBottom: session.message ? 'none' : '1px solid var(--color-border-separator)' }}
      >
        <div className="flex items-center gap-4">
          <span className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            CodeChat
          </span>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {session.files.length} file{session.files.length !== 1 ? 's' : ''} changed
          </span>
          <span className="text-sm font-mono" style={{ color: 'var(--color-success)' }}>
            +{totalAdditions}
          </span>
          <span className="text-sm font-mono" style={{ color: 'var(--color-danger)' }}>
            -{totalDeletions}
          </span>
          {pendingCount > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: 'var(--color-info)', color: 'var(--color-text-on-emphasis)' }}
            >
              {pendingCount} comment{pendingCount !== 1 ? 's' : ''}
            </span>
          )}
          {showDiffToast && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: 'var(--color-success)', color: 'var(--color-text-on-emphasis)' }}
            >
              Diff updated
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!state.isConnected && !state.isSubmitted && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-warning)' }}>
              <span
                className="animate-pulse inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: 'var(--color-warning)' }}
              />
              Reconnecting...
            </span>
          )}
          <button
            onClick={toggleTheme}
            className="rounded p-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
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
            Submit review
          </button>
        </div>
      </header>
      {session.message && (
        <div
          className="px-4 py-2 text-sm"
          style={{
            backgroundColor: 'var(--color-deep-bg)',
            borderBottom: '1px solid var(--color-border-separator)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span className="font-medium" style={{ color: 'var(--color-text-muted)', marginRight: '8px' }}>Agent:</span>
          {session.message}
        </div>
      )}
      {showSubmitDialog && (
        <SubmitDialog onClose={() => setShowSubmitDialog(false)} />
      )}
    </>
  );
}
