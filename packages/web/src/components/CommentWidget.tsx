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
    <div className="my-1 space-y-2 rounded border border-gray-600 bg-gray-800 p-3">
      {comments.map((comment) => (
        <div key={comment.id} className="text-sm">
          <div className="flex items-start justify-between">
            <p className="whitespace-pre-wrap text-gray-200">{comment.body}</p>
            <button
              onClick={() => handleDelete(comment.id)}
              className="ml-2 shrink-0 text-xs text-gray-500 hover:text-red-400"
              title="Delete comment"
            >
              x
            </button>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {new Date(comment.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ))}
      <button
        onClick={onReply}
        className="text-xs text-blue-400 hover:text-blue-300"
      >
        Reply
      </button>
    </div>
  );
}
