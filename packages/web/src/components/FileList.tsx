import { useReview } from '../context/ReviewContext';
import type { FileSummary } from '../types';

const STATUS_COLORS: Record<FileSummary['status'], string> = {
  added: 'text-green-400',
  modified: 'text-yellow-400',
  deleted: 'text-red-400',
  renamed: 'text-blue-400',
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
    <aside className="w-72 shrink-0 overflow-y-auto border-r border-gray-700 bg-gray-900">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Files
      </div>
      <ul>
        {state.review.files.map((file) => {
          const commentsOnFile = state.review!.comments.filter(
            (c) => c.filePath === file.path,
          ).length;

          return (
            <li key={file.path}>
              <button
                onClick={() => onSelectFile(file.path)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-800 ${
                  activeFile === file.path ? 'bg-gray-800' : ''
                }`}
              >
                <span
                  className={`w-4 text-center text-xs font-bold ${STATUS_COLORS[file.status]}`}
                >
                  {STATUS_ICONS[file.status]}
                </span>
                <span className="min-w-0 flex-1 truncate text-gray-300">
                  {file.path}
                </span>
                {commentsOnFile > 0 && (
                  <span className="rounded-full bg-blue-600 px-1.5 text-xs text-white">
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
