import { useReview } from '../context/ReviewContext';
import type { FileSummary } from '../types';

const STATUS_COLORS: Record<FileSummary['status'], string> = {
  added: '#3fb950',
  modified: '#d29922',
  deleted: '#f85149',
  renamed: '#58a6ff',
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
      style={{ backgroundColor: '#010409', borderRight: '1px solid #21262d' }}
    >
      <div
        className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
        style={{ color: '#8b949e', borderBottom: '1px solid #21262d' }}
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
                  backgroundColor: isActive ? '#161b22' : 'transparent',
                  color: '#e6edf3',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = '#161b22';
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
                  style={{ color: '#e6edf3' }}
                >
                  {file.path}
                </span>
                {commentsOnFile > 0 && (
                  <span
                    className="shrink-0 rounded-full px-1.5 text-xs"
                    style={{ backgroundColor: '#1f6feb', color: '#ffffff' }}
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
