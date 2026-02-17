import type { FileSummary } from '../types';

const STATUS_LABELS: Record<FileSummary['status'], string> = {
  added: 'Added',
  modified: 'Modified',
  deleted: 'Deleted',
  renamed: 'Renamed',
};

const STATUS_BADGE_COLORS: Record<FileSummary['status'], string> = {
  added: 'bg-green-800 text-green-200',
  modified: 'bg-yellow-800 text-yellow-200',
  deleted: 'bg-red-800 text-red-200',
  renamed: 'bg-blue-800 text-blue-200',
};

interface FileHeaderProps {
  file: FileSummary;
  commentCount: number;
}

export function FileHeader({ file, commentCount }: FileHeaderProps) {
  return (
    <div className="flex items-center gap-3 rounded-t border border-gray-700 bg-gray-800 px-4 py-2">
      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_BADGE_COLORS[file.status]}`}>
        {STATUS_LABELS[file.status]}
      </span>
      <span className="text-sm font-mono text-gray-200">
        {file.oldPath && file.oldPath !== file.path
          ? `${file.oldPath} → ${file.path}`
          : file.path}
      </span>
      <span className="text-xs text-green-400">+{file.additions}</span>
      <span className="text-xs text-red-400">-{file.deletions}</span>
      {commentCount > 0 && (
        <span className="rounded-full bg-blue-600 px-1.5 text-xs text-white">
          {commentCount}
        </span>
      )}
    </div>
  );
}
