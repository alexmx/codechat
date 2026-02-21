import { useState, useMemo, useCallback } from 'react';
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

// --- Tree data structure ---

interface TreeNode {
  name: string;
  fullPath: string;
  children: TreeNode[];
  file?: FileSummary;
}

function buildTree(files: FileSummary[]): TreeNode {
  const root: TreeNode = { name: '', fullPath: '', children: [] };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;

      if (isLeaf) {
        current.children.push({
          name: part,
          fullPath: file.path,
          children: [],
          file,
        });
      } else {
        let child = current.children.find((c) => !c.file && c.name === part);
        if (!child) {
          child = { name: part, fullPath: parts.slice(0, i + 1).join('/'), children: [] };
          current.children.push(child);
        }
        current = child;
      }
    }
  }

  return compactTree(root);
}

/** Collapse single-child directories: a/b/c → a/b/c */
function compactTree(node: TreeNode): TreeNode {
  node.children = node.children.map(compactTree);

  if (!node.file && node.children.length === 1 && !node.children[0].file) {
    const child = node.children[0];
    return {
      name: node.name ? `${node.name}/${child.name}` : child.name,
      fullPath: child.fullPath,
      children: child.children,
    };
  }

  // Sort: directories first, then files, alphabetically within each group
  node.children.sort((a, b) => {
    const aIsDir = !a.file;
    const bIsDir = !b.file;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return node;
}

// --- Components ---

interface FileListProps {
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}

type ViewMode = 'flat' | 'tree';

export function FileList({ activeFile, onSelectFile }: FileListProps) {
  const { state } = useReview();
  const [viewMode, setViewMode] = useState<ViewMode>('tree');

  const tree = useMemo(() => {
    if (!state.session) return null;
    return buildTree(state.session.files);
  }, [state.session?.files]);

  if (!state.session) return null;

  const commentsByFile = new Map<string, number>();
  for (const c of state.session.comments) {
    commentsByFile.set(c.filePath, (commentsByFile.get(c.filePath) ?? 0) + 1);
  }

  return (
    <aside
      className="w-72 shrink-0 overflow-y-auto"
      style={{ backgroundColor: 'var(--color-deep-bg)', borderRight: '1px solid var(--color-border-separator)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border-separator)' }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Files changed
        </span>
        <div
          className="inline-flex overflow-hidden rounded"
          style={{ border: '1px solid var(--color-border-default)' }}
        >
          <button
            onClick={() => setViewMode('tree')}
            className="px-1.5 py-0.5"
            style={{
              backgroundColor: viewMode === 'tree' ? 'var(--color-elevated-bg)' : 'transparent',
              color: viewMode === 'tree' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            }}
            title="Tree view"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.75 7a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5ZM5 4.75a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 5 4.75ZM6.75 10a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('flat')}
            className="px-1.5 py-0.5"
            style={{
              backgroundColor: viewMode === 'flat' ? 'var(--color-elevated-bg)' : 'transparent',
              color: viewMode === 'flat' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              borderLeft: '1px solid var(--color-border-default)',
            }}
            title="Flat view"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 4.75a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 3.5a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8.25Zm0 3.5a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" />
            </svg>
          </button>
        </div>
      </div>

      {viewMode === 'flat' ? (
        <FlatList
          files={state.session.files}
          commentsByFile={commentsByFile}
          activeFile={activeFile}
          onSelectFile={onSelectFile}
        />
      ) : (
        tree && (
          <TreeView
            nodes={tree.children}
            commentsByFile={commentsByFile}
            activeFile={activeFile}
            onSelectFile={onSelectFile}
          />
        )
      )}
    </aside>
  );
}

// --- Flat list (original view) ---

interface FlatListProps {
  files: FileSummary[];
  commentsByFile: Map<string, number>;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}

function FlatList({ files, commentsByFile, activeFile, onSelectFile }: FlatListProps) {
  return (
    <ul className="py-1">
      {files.map((file) => (
        <FileRow
          key={file.path}
          file={file}
          label={file.path}
          depth={0}
          commentCount={commentsByFile.get(file.path) ?? 0}
          isActive={activeFile === file.path}
          onSelect={onSelectFile}
        />
      ))}
    </ul>
  );
}

// --- Tree view ---

interface TreeViewProps {
  nodes: TreeNode[];
  commentsByFile: Map<string, number>;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}

function TreeView({ nodes, commentsByFile, activeFile, onSelectFile }: TreeViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleDir = useCallback((path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  return (
    <ul className="py-1">
      {nodes.map((node) => (
        <TreeNodeRow
          key={node.fullPath}
          node={node}
          depth={0}
          collapsed={collapsed}
          toggleDir={toggleDir}
          commentsByFile={commentsByFile}
          activeFile={activeFile}
          onSelectFile={onSelectFile}
        />
      ))}
    </ul>
  );
}

interface TreeNodeRowProps {
  node: TreeNode;
  depth: number;
  collapsed: Set<string>;
  toggleDir: (path: string) => void;
  commentsByFile: Map<string, number>;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}

function TreeNodeRow({
  node,
  depth,
  collapsed,
  toggleDir,
  commentsByFile,
  activeFile,
  onSelectFile,
}: TreeNodeRowProps) {
  if (node.file) {
    return (
      <FileRow
        file={node.file}
        label={node.name}
        depth={depth}
        commentCount={commentsByFile.get(node.file.path) ?? 0}
        isActive={activeFile === node.file.path}
        onSelect={onSelectFile}
      />
    );
  }

  const isCollapsed = collapsed.has(node.fullPath);

  return (
    <li>
      <button
        onClick={() => toggleDir(node.fullPath)}
        className="flex w-full items-center gap-1.5 py-1 text-left text-xs"
        style={{
          paddingLeft: `${depth * 12 + 16}px`,
          color: 'var(--color-text-secondary)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-bg)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="shrink-0"
          style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}
        >
          <path d="M4.427 7.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z" />
        </svg>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="shrink-0" style={{ opacity: 0.6 }}>
          <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z" />
        </svg>
        <span className="truncate font-mono">{node.name}</span>
      </button>
      {!isCollapsed && (
        <ul>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              toggleDir={toggleDir}
              commentsByFile={commentsByFile}
              activeFile={activeFile}
              onSelectFile={onSelectFile}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// --- Shared file row ---

interface FileRowProps {
  file: FileSummary;
  label: string;
  depth: number;
  commentCount: number;
  isActive: boolean;
  onSelect: (path: string) => void;
}

function FileRow({ file, label, depth, commentCount, isActive, onSelect }: FileRowProps) {
  return (
    <li>
      <button
        onClick={() => onSelect(file.path)}
        className="flex w-full items-center gap-2 py-1.5 text-left text-sm"
        style={{
          paddingLeft: `${depth * 12 + 16}px`,
          paddingRight: '16px',
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
          {label}
        </span>
        {commentCount > 0 && (
          <span
            className="shrink-0 rounded-full px-1.5 text-xs"
            style={{ backgroundColor: 'var(--color-info)', color: 'var(--color-text-on-emphasis)' }}
          >
            {commentCount}
          </span>
        )}
      </button>
    </li>
  );
}
