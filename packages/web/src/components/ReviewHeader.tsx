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
      <header className="flex items-center justify-between border-b border-gray-700 bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold text-gray-100">CodeChat</span>
          <span className="text-sm text-gray-400">
            {review.files.length} file{review.files.length !== 1 ? 's' : ''} changed
          </span>
          <span className="text-sm text-green-400">+{totalAdditions}</span>
          <span className="text-sm text-red-400">-{totalDeletions}</span>
          {review.comments.length > 0 && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
              {review.comments.length} comment{review.comments.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSubmitDialog(true)}
          className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700"
        >
          Submit Review
        </button>
      </header>
      {showSubmitDialog && (
        <SubmitDialog onClose={() => setShowSubmitDialog(false)} />
      )}
    </>
  );
}
