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
    <div
      className="my-2 rounded-md p-3"
      style={{ backgroundColor: 'var(--color-page-bg)', border: '1px solid var(--color-border-default)' }}
    >
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Leave a comment"
        rows={3}
        className="w-full resize-y rounded-md p-2 text-sm"
        style={{
          backgroundColor: 'var(--color-deep-bg)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border-default)',
          outline: 'none',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-link)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-default)')}
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!body.trim()}
          className="rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-40"
          style={{ backgroundColor: 'var(--color-btn-green-bg)', color: 'var(--color-text-on-emphasis)', border: '1px solid var(--color-btn-border)' }}
        >
          Add comment
        </button>
        <button
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Cancel
        </button>
        <span className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to submit
        </span>
      </div>
    </div>
  );
}
