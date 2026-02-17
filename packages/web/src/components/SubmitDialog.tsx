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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-100">Submit Review</h2>
        <p className="mb-6 text-sm text-gray-400">
          {commentCount} comment{commentCount !== 1 ? 's' : ''} on this review.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => submit('approved')}
            className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Approve
          </button>
          <button
            onClick={() => submit('changes_requested')}
            className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Request Changes
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
