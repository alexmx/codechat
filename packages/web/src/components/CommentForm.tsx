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
      style={{ backgroundColor: '#0d1117', border: '1px solid #30363d' }}
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
          backgroundColor: '#010409',
          color: '#e6edf3',
          border: '1px solid #30363d',
          outline: 'none',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#58a6ff')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#30363d')}
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!body.trim()}
          className="rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-40"
          style={{ backgroundColor: '#238636', color: '#ffffff', border: '1px solid rgba(240,246,252,0.1)' }}
        >
          Add comment
        </button>
        <button
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm"
          style={{ color: '#8b949e' }}
        >
          Cancel
        </button>
        <span className="ml-auto text-xs" style={{ color: '#484f58' }}>
          {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to submit
        </span>
      </div>
    </div>
  );
}
