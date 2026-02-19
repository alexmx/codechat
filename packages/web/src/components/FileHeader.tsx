import type { FileSummary } from '../types';

interface FileHeaderProps {
  file: FileSummary;
  commentCount: number;
}

export function FileHeader({ file, commentCount }: FileHeaderProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2"
      style={{
        backgroundColor: 'var(--color-surface-bg)',
        border: '1px solid var(--color-border-default)',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--color-text-secondary)">
        <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v8.586A1.75 1.75 0 0 1 13.25 15h-9.5A1.75 1.75 0 0 1 2 13.25Zm1.75-.25a.25.25 0 0 0-.25.25v11.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-2.914-2.914a.25.25 0 0 0-.177-.073Z" />
      </svg>
      <span className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>
        {file.oldPath && file.oldPath !== file.path
          ? `${file.oldPath} → ${file.path}`
          : file.path}
      </span>
      {commentCount > 0 && (
        <span
          className="rounded-full px-1.5 text-xs"
          style={{ backgroundColor: 'var(--color-info)', color: 'var(--color-text-on-emphasis)' }}
        >
          {commentCount}
        </span>
      )}
    </div>
  );
}
