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
    <div className="flex-1 overflow-y-auto px-6 py-4" style={{ backgroundColor: '#0d1117' }}>
      <div
        className="mb-4 inline-flex overflow-hidden rounded-md"
        style={{ border: '1px solid #30363d' }}
      >
        <button
          onClick={() => setViewType('unified')}
          className="px-3 py-1 text-xs font-medium"
          style={{
            backgroundColor: viewType === 'unified' ? '#21262d' : 'transparent',
            color: viewType === 'unified' ? '#e6edf3' : '#8b949e',
            borderRight: '1px solid #30363d',
          }}
        >
          Unified
        </button>
        <button
          onClick={() => setViewType('split')}
          className="px-3 py-1 text-xs font-medium"
          style={{
            backgroundColor: viewType === 'split' ? '#21262d' : 'transparent',
            color: viewType === 'split' ? '#e6edf3' : '#8b949e',
          }}
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
            className="mb-4"
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
  const [commentingOnKey, setCommentingOnKey] = useState<string | null>(null);
  const [commentingLineInfo, setCommentingLineInfo] = useState<{
    line: number;
    side: 'old' | 'new';
  } | null>(null);

  const widgets = useMemo(() => {
    const w: Record<string, ReactNode> = {};

    const commentsByKey = new Map<string, Comment[]>();
    for (const comment of comments) {
      const changeKey = commentToChangeKey(comment, file.hunks);
      if (changeKey) {
        const existing = commentsByKey.get(changeKey) ?? [];
        existing.push(comment);
        commentsByKey.set(changeKey, existing);
      }
    }

    for (const [changeKey, keyComments] of commentsByKey) {
      w[changeKey] = (
        <CommentWidget
          comments={keyComments}
          onReply={() => {
            setCommentingOnKey(changeKey);
            const c = keyComments[0];
            setCommentingLineInfo({ line: c.line, side: c.side });
          }}
        />
      );
    }

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
      <div
        className="p-4 text-sm"
        style={{
          backgroundColor: '#161b22',
          color: '#484f58',
          border: '1px solid #30363d',
          borderTop: 'none',
          borderBottomLeftRadius: 6,
          borderBottomRightRadius: 6,
        }}
      >
        No changes to display
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto"
      style={{
        border: '1px solid #30363d',
        borderTop: 'none',
        borderBottomLeftRadius: 6,
        borderBottomRightRadius: 6,
      }}
    >
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
