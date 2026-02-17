import { useState, useMemo, useCallback, type ReactNode } from 'react';
import { parseDiff, Diff, Hunk, getChangeKey } from 'react-diff-view';
import 'react-diff-view/style/index.css';
import { useReview } from '../context/ReviewContext';
import { FileHeader } from './FileHeader';
import { CommentWidget } from './CommentWidget';
import { CommentForm } from './CommentForm';
import { commentToChangeKey, changeToLineInfo } from '../utils/changeKeyMapping';
import type { Comment } from '../types';

interface DiffViewProps {
  activeFile: string | null;
}

export function DiffView({ activeFile }: DiffViewProps) {
  const { state } = useReview();
  const [viewType, setViewType] = useState<'unified' | 'split'>('unified');

  const files = useMemo(() => {
    if (!state.review) return [];
    return parseDiff(state.review.diff, { nearbySequences: 'zip' });
  }, [state.review?.diff]);

  if (!state.review) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-950 p-4">
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setViewType('unified')}
          className={`rounded px-3 py-1 text-sm ${
            viewType === 'unified'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Unified
        </button>
        <button
          onClick={() => setViewType('split')}
          className={`rounded px-3 py-1 text-sm ${
            viewType === 'split'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Split
        </button>
      </div>

      {files.map((file) => {
        const filePath = file.newPath || file.oldPath || '';
        const fileSummary = state.review!.files.find((f) => f.path === filePath);
        const fileComments = state.review!.comments.filter(
          (c) => c.filePath === filePath,
        );

        return (
          <div
            key={filePath}
            id={`file-${encodeURIComponent(filePath)}`}
            className="mb-6"
          >
            {fileSummary && (
              <FileHeader file={fileSummary} commentCount={fileComments.length} />
            )}
            <FileDiffSection
              file={file}
              filePath={filePath}
              viewType={viewType}
              comments={fileComments}
            />
          </div>
        );
      })}
    </div>
  );
}

interface FileDiffSectionProps {
  file: ReturnType<typeof parseDiff>[number];
  filePath: string;
  viewType: 'unified' | 'split';
  comments: Comment[];
}

function FileDiffSection({ file, filePath, viewType, comments }: FileDiffSectionProps) {
  const { send } = useReview();
  const [commentingOnKey, setCommentingOnKey] = useState<string | null>(null);
  const [commentingLineInfo, setCommentingLineInfo] = useState<{
    line: number;
    side: 'old' | 'new';
  } | null>(null);

  const widgets = useMemo(() => {
    const w: Record<string, ReactNode> = {};

    // Group existing comments by changeKey
    const commentsByKey = new Map<string, Comment[]>();
    for (const comment of comments) {
      const changeKey = commentToChangeKey(comment, file.hunks);
      if (changeKey) {
        const existing = commentsByKey.get(changeKey) ?? [];
        existing.push(comment);
        commentsByKey.set(changeKey, existing);
      }
    }

    // Render existing comment widgets
    for (const [changeKey, keyComments] of commentsByKey) {
      w[changeKey] = (
        <CommentWidget
          comments={keyComments}
          onReply={() => {
            setCommentingOnKey(changeKey);
            // Extract line info from the first comment
            const c = keyComments[0];
            setCommentingLineInfo({ line: c.line, side: c.side });
          }}
        />
      );
    }

    // Active comment form
    if (commentingOnKey && commentingLineInfo) {
      const existing = w[commentingOnKey];
      w[commentingOnKey] = (
        <>
          {existing}
          <CommentForm
            filePath={filePath}
            line={commentingLineInfo.line}
            side={commentingLineInfo.side}
            onCancel={() => {
              setCommentingOnKey(null);
              setCommentingLineInfo(null);
            }}
          />
        </>
      );
    }

    return w;
  }, [comments, commentingOnKey, commentingLineInfo, filePath, file.hunks]);

  const handleGutterClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ change }: { change: any }) => {
      if (!change) return;
      const key = getChangeKey(change);
      const lineInfo = changeToLineInfo(change);
      setCommentingOnKey(key);
      setCommentingLineInfo(lineInfo);
    },
    [],
  );

  const gutterEvents = useMemo(
    () => ({
      onClick: handleGutterClick,
    }),
    [handleGutterClick],
  );

  if (file.hunks.length === 0) {
    return (
      <div className="rounded-b border border-t-0 border-gray-700 bg-gray-900 p-4 text-sm text-gray-500">
        No changes to display
      </div>
    );
  }

  return (
    <div className="diff-wrapper overflow-x-auto rounded-b border border-t-0 border-gray-700">
      <Diff
        viewType={viewType}
        diffType={file.type}
        hunks={file.hunks}
        widgets={widgets}
        gutterEvents={gutterEvents}
      >
        {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
      </Diff>
    </div>
  );
}
