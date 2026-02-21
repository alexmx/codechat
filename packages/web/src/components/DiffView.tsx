import { useState, useMemo, useCallback, type ReactNode } from 'react';
import { parseDiff, Diff, Hunk, tokenize, markEdits } from 'react-diff-view';
import { refractor } from 'refractor';
import tsx from 'refractor/tsx';
import jsx from 'refractor/jsx';
import 'react-diff-view/style/index.css';
import { useReview } from '../context/ReviewContext';
import { FileHeader } from './FileHeader';
import { CommentWidget } from './CommentWidget';
import { CommentForm } from './CommentForm';
import { buildChangeKeyMap, changeToLineInfo } from '../utils/changeKeyMapping';
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
        const filePath = file.newPath || file.oldPath || '';
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

function FileDiffSection({ file, filePath, viewType, comments, showResolved }: FileDiffSectionProps) {
  const { state, startDraft, discardDraft } = useReview();
  const draft = state.activeDraft?.filePath === filePath ? state.activeDraft : null;

  const tokens = useMemo(() => {
    const language = detectLanguage(filePath);
    if (!language || file.hunks.length === 0) return undefined;
    if (!refractorAdapter.registered(language)) return undefined;
    try {
      return tokenize(file.hunks, {
        highlight: true,
        refractor: refractorAdapter,
        language,
        enhancers: [markEdits(file.hunks)],
      });
    } catch {
      return undefined;
    }
  }, [file.hunks, filePath]);

  const changeKeyMap = useMemo(() => buildChangeKeyMap(file.hunks), [file.hunks]);

  const draftChangeKey = draft ? (changeKeyMap.get(`${draft.side}:${draft.line}`) ?? null) : null;

  const widgets = useMemo(() => {
    const w: Record<string, ReactNode> = {};

    const visibleComments = showResolved ? comments : comments.filter((c) => !c.resolved);

    const commentsByKey = new Map<string, Comment[]>();
    for (const comment of visibleComments) {
      const changeKey = changeKeyMap.get(`${comment.side}:${comment.line}`) ?? null;
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
            startDraft(filePath, c.line, c.side);
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
            onCancel={discardDraft}
          />
        </>
      );
    }

    return w;
  }, [comments, draftChangeKey, draft, filePath, changeKeyMap, showResolved, startDraft, discardDraft]);

  const handleGutterClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ change }: { change: any }) => {
      if (!change) return;
      const lineInfo = changeToLineInfo(change);
      startDraft(filePath, lineInfo.line, lineInfo.side);
    },
    [filePath, startDraft],
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
        hunks={file.hunks}
        widgets={widgets}
        tokens={tokens}
        gutterEvents={gutterEvents}
      >
        {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
      </Diff>
    </div>
  );
}
