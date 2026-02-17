import { useState, useRef, useEffect } from 'react';
import { useReview } from '../context/ReviewContext';

interface CommentFormProps {
  filePath: string;
  line: number;
  side: 'old' | 'new';
  onCancel: () => void;
}

export function CommentForm({ filePath, line, side, onCancel }: CommentFormProps) {
  const { send } = useReview();
  const [body, setBody] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    send({
      type: 'add_comment',
      data: { filePath, line, side, body: trimmed },
    });
    setBody('');
    onCancel();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  }

  return (
    <div className="my-1 rounded border border-gray-600 bg-gray-800 p-3">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Leave a comment..."
        rows={3}
        className="w-full resize-y rounded border border-gray-600 bg-gray-900 p-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!body.trim()}
          className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Comment
        </button>
        <button
          onClick={onCancel}
          className="rounded px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
        >
          Cancel
        </button>
        <span className="ml-auto text-xs text-gray-500">
          Ctrl+Enter to submit
        </span>
      </div>
    </div>
  );
}
