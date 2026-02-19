import { useReview } from '../context/ReviewContext';
import type { FileSummary } from '../types';

const STATUS_COLORS: Record<FileSummary['status'], string> = {
  added: 'var(--color-success)',
  modified: 'var(--color-warning)',
  deleted: 'var(--color-danger)',
  renamed: 'var(--color-link)',
};

const STATUS_ICONS: Record<FileSummary['status'], string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
};

interface FileListProps {
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}

export function FileList({ activeFile, onSelectFile }: FileListProps) {
  const { state } = useReview();
  if (!state.review) return null;

  return (
    <aside
      className="w-72 shrink-0 overflow-y-auto"
      style={{ backgroundColor: 'var(--color-deep-bg)', borderRight: '1px solid var(--color-border-separator)' }}
    >
      <div
        className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-separator)' }}
      >
        Files changed
      </div>
      <ul className="py-1">
        {state.review.files.map((file) => {
          const commentsOnFile = state.review!.comments.filter(
            (c) => c.filePath === file.path,
          ).length;
          const isActive = activeFile === file.path;

          return (
            <li key={file.path}>
              <button
                onClick={() => onSelectFile(file.path)}
                className="flex w-full items-center gap-2 px-4 py-1.5 text-left text-sm"
                style={{
                  backgroundColor: isActive ? 'var(--color-surface-bg)' : 'transparent',
                  color: 'var(--color-text-primary)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-surface-bg)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span
                  className="w-4 shrink-0 text-center text-xs font-bold"
                  style={{ color: STATUS_COLORS[file.status] }}
                >
                  {STATUS_ICONS[file.status]}
                </span>
                <span
                  className="min-w-0 flex-1 truncate font-mono text-xs"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {file.path}
                </span>
                {commentsOnFile > 0 && (
                  <span
                    className="shrink-0 rounded-full px-1.5 text-xs"
                    style={{ backgroundColor: 'var(--color-info)', color: 'var(--color-text-on-emphasis)' }}
                  >
                    {commentsOnFile}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
