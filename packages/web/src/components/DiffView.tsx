import { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { parseDiff, Diff, Hunk, Decoration, tokenize, markEdits, expandFromRawCode, getCollapsedLinesCountBetween } from 'react-diff-view';
import { refractor } from 'refractor';
import tsx from 'refractor/tsx';
import jsx from 'refractor/jsx';
import 'react-diff-view/style/index.css';
import { useReview } from '../context/ReviewContext';
import { FileHeader } from './FileHeader';
import { CommentWidget } from './CommentWidget';
import { CommentForm } from './CommentForm';
import { buildChangeKeyMap } from '../utils/changeKeyMapping';
import { useGutterDrag } from '../hooks/useGutterDrag';
import { detectLanguage } from '../utils/languageDetect';
import type { Comment } from '../types';

// Register languages not in refractor's common bundle
refractor.register(tsx);
refractor.register(jsx);

// Adapter: refractor v5 returns { type: 'root', children: [...] } from highlight(),
// but react-diff-view v3 expects highlight() to return just the children array.
const refractorAdapter = {
  highlight: (code: string, language: string) => refractor.highlight(code, language).children,
  registered: (lang: string) => refractor.registered(lang),
};

/** Number of lines to expand per click */
const EXPAND_LINES = 20;

interface DiffViewProps {
  activeFile: string | null;
}

export function DiffView({ activeFile }: DiffViewProps) {
  const { state } = useReview();
  const [viewType, setViewType] = useState<'unified' | 'split'>('unified');
  const [showResolved, setShowResolved] = useState(true);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());

  const files = useMemo(() => {
    if (!state.session) return [];
    return parseDiff(state.session.diff, { nearbySequences: 'zip' });
  }, [state.session?.diff]);

  if (!state.session) return null;

  const resolvedCount = state.session.comments.filter((c) => c.resolved).length;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4" style={{ backgroundColor: 'var(--color-page-bg)' }}>
      <div className="mb-4 flex items-center gap-3">
        <div
          className="inline-flex overflow-hidden rounded-md"
          style={{ border: '1px solid var(--color-border-default)' }}
        >
          <button
            onClick={() => setViewType('unified')}
            className="px-3 py-1 text-xs font-medium"
            style={{
              backgroundColor: viewType === 'unified' ? 'var(--color-elevated-bg)' : 'transparent',
              color: viewType === 'unified' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              borderRight: '1px solid var(--color-border-default)',
            }}
          >
            Unified
          </button>
          <button
            onClick={() => setViewType('split')}
            className="px-3 py-1 text-xs font-medium"
            style={{
              backgroundColor: viewType === 'split' ? 'var(--color-elevated-bg)' : 'transparent',
              color: viewType === 'split' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            }}
          >
            Split
          </button>
        </div>
        {resolvedCount > 0 && (
          <button
            onClick={() => setShowResolved((v) => !v)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium"
            style={{
              border: '1px solid var(--color-border-default)',
              color: showResolved ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              backgroundColor: showResolved ? 'var(--color-elevated-bg)' : 'transparent',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
            </svg>
            {resolvedCount} resolved
          </button>
        )}
      </div>

      {files.map((file) => {
        const filePath = (file.newPath && file.newPath !== '/dev/null') ? file.newPath : file.oldPath || '';
        const fileSummary = state.session!.files.find((f) => f.path === filePath);
        const fileComments = state.session!.comments.filter(
          (c) => c.filePath === filePath,
        );

        const isCollapsed = collapsedFiles.has(filePath);

        return (
          <div
            key={filePath}
            id={`file-${encodeURIComponent(filePath)}`}
            className="mb-4"
          >
            {fileSummary && (
              <FileHeader
                file={fileSummary}
                commentCount={fileComments.length}
                isCollapsed={isCollapsed}
                isActive={activeFile === filePath}
                onToggle={() => {
                  setCollapsedFiles((prev) => {
                    const next = new Set(prev);
                    if (next.has(filePath)) next.delete(filePath);
                    else next.add(filePath);
                    return next;
                  });
                }}
              />
            )}
            {!isCollapsed && (
              <FileDiffSection
                file={file}
                filePath={filePath}
                viewType={viewType}
                comments={fileComments}
                showResolved={showResolved}
              />
            )}
          </div>
        );
      })}
      {files.length > 0 && collapsedFiles.size >= files.length && (
        <div
          className="mt-4 text-center text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          All files collapsed. Click a file header to expand.
        </div>
      )}
    </div>
  );
}

interface FileDiffSectionProps {
  file: ReturnType<typeof parseDiff>[number];
  filePath: string;
  viewType: 'unified' | 'split';
  comments: Comment[];
  showResolved: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHunk = any;

function FileDiffSection({ file, filePath, viewType, comments, showResolved }: FileDiffSectionProps) {
  const { state, startDraft, discardDraft, requestFileContent } = useReview();
  const draft = state.activeDraft?.filePath === filePath ? state.activeDraft : null;
  const fileContent = state.fileContents[filePath];

  // Track expanded hunks independently from the parsed diff
  const [expandedHunks, setExpandedHunks] = useState<AnyHunk[] | null>(null);
  const pendingExpand = useRef<{ start: number; end: number } | null>(null);

  // Use the old file content as the source for expansion (old line numbers are the reference)
  const rawSource = fileContent?.oldContent ?? fileContent?.newContent ?? null;

  const hunks = expandedHunks ?? file.hunks;

  const expand = useCallback(
    (start: number, end: number) => {
      if (!rawSource) {
        // Request file content; queue the expand for when it arrives
        pendingExpand.current = { start, end };
        requestFileContent(filePath);
        return;
      }
      setExpandedHunks((prev) => {
        const current = prev ?? file.hunks;
        return expandFromRawCode(current, rawSource, start, end);
      });
    },
    [rawSource, file.hunks, filePath, requestFileContent],
  );

  // Apply pending expansion when file content arrives
  useEffect(() => {
    if (rawSource && pendingExpand.current) {
      const { start, end } = pendingExpand.current;
      pendingExpand.current = null;
      setExpandedHunks((prev) => {
        const current = prev ?? file.hunks;
        return expandFromRawCode(current, rawSource, start, end);
      });
    }
  }, [rawSource, file.hunks]);

  const tokens = useMemo(() => {
    const language = detectLanguage(filePath);
    if (!language || hunks.length === 0) return undefined;
    if (!refractorAdapter.registered(language)) return undefined;
    try {
      return tokenize(hunks, {
        highlight: true,
        refractor: refractorAdapter,
        language,
        enhancers: [markEdits(hunks)],
      });
    } catch {
      return undefined;
    }
  }, [hunks, filePath]);

  const changeKeyMap = useMemo(() => buildChangeKeyMap(hunks), [hunks]);

  const handleDragSelect = useCallback(
    (side: 'old' | 'new', startLine: number, endLine: number) => {
      startDraft(filePath, startLine, side, endLine !== startLine ? endLine : undefined);
    },
    [filePath, startDraft],
  );

  const { gutterEvents, selectedChanges } = useGutterDrag({
    hunks,
    onSelect: handleDragSelect,
  });

  // For range comments, anchor the widget at endLine so it appears after the last line of the range
  const draftAnchorLine = draft ? (draft.endLine ?? draft.line) : null;
  const draftChangeKey = draft && draftAnchorLine
    ? (changeKeyMap.get(`${draft.side}:${draftAnchorLine}`) ?? null)
    : null;

  const widgets = useMemo(() => {
    const w: Record<string, ReactNode> = {};

    const visibleComments = showResolved ? comments : comments.filter((c) => !c.resolved);

    const commentsByKey = new Map<string, Comment[]>();
    for (const comment of visibleComments) {
      // Anchor at endLine for range comments so the widget sits after the last line
      const anchorLine = comment.endLine ?? comment.line;
      const changeKey = changeKeyMap.get(`${comment.side}:${anchorLine}`) ?? null;
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
            const c = keyComments[0];
            startDraft(filePath, c.line, c.side, c.endLine);
          }}
        />
      );
    }

    if (draftChangeKey) {
      const existing = w[draftChangeKey];
      w[draftChangeKey] = (
        <>
          {existing}
          <CommentForm
            filePath={filePath}
            line={draft!.line}
            side={draft!.side}
            endLine={draft!.endLine}
            onCancel={discardDraft}
          />
        </>
      );
    }

    return w;
  }, [comments, draftChangeKey, draft, filePath, changeKeyMap, showResolved, startDraft, discardDraft]);

  // Reset expanded hunks when the underlying diff changes
  const [prevFileHunks, setPrevFileHunks] = useState(file.hunks);
  if (file.hunks !== prevFileHunks) {
    setPrevFileHunks(file.hunks);
    setExpandedHunks(null);
  }

  if (file.hunks.length === 0) {
    return (
      <div
        className="rounded-b-md p-4 text-sm"
        style={{
          backgroundColor: 'var(--color-surface-bg)',
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border-default)',
          borderTop: 'none',
        }}
      >
        No changes to display
      </div>
    );
  }

  // Determine total lines for the file (from raw source or last hunk)
  const totalLines = rawSource
    ? (typeof rawSource === 'string' ? rawSource.split('\n').length : rawSource.length)
    : null;

  const renderHunks = (hunkList: AnyHunk[]) => {
    const elements: ReactNode[] = [];

    for (let i = 0; i < hunkList.length; i++) {
      const hunk = hunkList[i];
      const prevHunk: AnyHunk | null = i > 0 ? hunkList[i - 1] : null;

      // Collapsed lines before this hunk
      const collapsedCount = getCollapsedLinesCountBetween(prevHunk, hunk);

      if (collapsedCount > 0) {
        elements.push(
          <ExpandButton
            key={`expand-${i}`}
            collapsedCount={collapsedCount}
            isFirst={i === 0}
            isLast={false}
            onExpandUp={() => {
              const end = hunk.oldStart;
              const start = Math.max(prevHunk ? prevHunk.oldStart + prevHunk.oldLines : 1, end - EXPAND_LINES);
              expand(start, end);
            }}
            onExpandDown={() => {
              const start = prevHunk ? prevHunk.oldStart + prevHunk.oldLines : 1;
              const end = Math.min(hunk.oldStart, start + EXPAND_LINES);
              expand(start, end);
            }}
            onExpandAll={() => {
              const start = prevHunk ? prevHunk.oldStart + prevHunk.oldLines : 1;
              const end = hunk.oldStart;
              expand(start, end);
            }}
          />,
        );
      }

      elements.push(<Hunk key={hunk.content} hunk={hunk} />);
    }

    // Collapsed lines after the last hunk
    if (totalLines && hunkList.length > 0) {
      const lastHunk = hunkList[hunkList.length - 1];
      const lastOldEnd = lastHunk.oldStart + lastHunk.oldLines;
      const trailingLines = totalLines - lastOldEnd + 1;

      if (trailingLines > 0) {
        elements.push(
          <ExpandButton
            key="expand-tail"
            collapsedCount={trailingLines}
            isFirst={false}
            isLast={true}
            onExpandUp={() => {
              const start = lastOldEnd;
              const end = Math.min(totalLines + 1, start + EXPAND_LINES);
              expand(start, end);
            }}
            onExpandDown={() => {
              expand(lastOldEnd, totalLines + 1);
            }}
            onExpandAll={() => {
              expand(lastOldEnd, totalLines + 1);
            }}
          />,
        );
      }
    }

    return elements;
  };

  return (
    <div
      className="overflow-x-auto rounded-b-md"
      style={{
        border: '1px solid var(--color-border-default)',
        borderTop: 'none',
      }}
    >
      <Diff
        viewType={viewType}
        diffType={file.type}
        hunks={hunks}
        widgets={widgets}
        tokens={tokens}
        gutterEvents={gutterEvents}
        selectedChanges={selectedChanges}
      >
        {renderHunks}
      </Diff>
    </div>
  );
}

interface ExpandButtonProps {
  collapsedCount: number;
  isFirst: boolean;
  isLast: boolean;
  onExpandUp: () => void;
  onExpandDown: () => void;
  onExpandAll: () => void;
}

function ExpandButton({ collapsedCount, isFirst, isLast, onExpandUp, onExpandDown, onExpandAll }: ExpandButtonProps) {
  // For small gaps, just show "expand all"
  const showDirectional = collapsedCount > EXPAND_LINES;

  return (
    <Decoration>
      <div
        className="flex items-center gap-2 px-3 py-0.5 text-xs select-none"
        style={{
          backgroundColor: 'var(--color-diff-expand-bg, var(--color-surface-bg))',
          color: 'var(--color-text-muted)',
          borderTop: '1px solid var(--color-border-default)',
          borderBottom: '1px solid var(--color-border-default)',
        }}
      >
        {showDirectional && !isFirst && (
          <button
            onClick={onExpandUp}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[var(--color-elevated-bg)]"
            style={{ color: 'var(--color-accent)' }}
            title={`Expand ${EXPAND_LINES} lines up`}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.47 7.78a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018L8.5 4.31V14.25a.75.75 0 0 1-1.5 0V4.31L3.53 7.78a.75.75 0 0 1-1.06 0Z" />
            </svg>
          </button>
        )}
        <button
          onClick={onExpandAll}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[var(--color-elevated-bg)]"
          style={{ color: 'var(--color-accent)' }}
          title={`Expand all ${collapsedCount} hidden lines`}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.75 10a.75.75 0 0 1 .75.75v2.5h2.5a.75.75 0 0 1 0 1.5h-3.25a.75.75 0 0 1-.75-.75v-3.25a.75.75 0 0 1 .75-.75Zm12.5 0a.75.75 0 0 1 .75.75v3.25a.75.75 0 0 1-.75.75h-3.25a.75.75 0 0 1 0-1.5h2.5v-2.5a.75.75 0 0 1 .75-.75ZM2.5 2.75v2.5a.75.75 0 0 1-1.5 0V1.75A.75.75 0 0 1 1.75 1H5a.75.75 0 0 1 0 1.5H2.5Zm11 0H11a.75.75 0 0 1 0-1.5h3.25a.75.75 0 0 1 .75.75v3.25a.75.75 0 0 1-1.5 0v-2.5Z" />
          </svg>
          {collapsedCount} hidden lines
        </button>
        {showDirectional && !isLast && (
          <button
            onClick={onExpandDown}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[var(--color-elevated-bg)]"
            style={{ color: 'var(--color-accent)' }}
            title={`Expand ${EXPAND_LINES} lines down`}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.53 8.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L2.97 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018l3.47 3.47V1.75a.75.75 0 0 1 1.5 0v9.94l3.47-3.47a.75.75 0 0 1 1.06 0Z" />
            </svg>
          </button>
        )}
      </div>
    </Decoration>
  );
}
