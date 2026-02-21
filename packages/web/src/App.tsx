import { useState, useCallback, useRef, Component, type ReactNode } from 'react';
import { ReviewProvider, useReview } from './context/ReviewContext';
import { ReviewHeader } from './components/ReviewHeader';
import { FileList } from './components/FileList';
import { DiffView } from './components/DiffView';
import { LoadingScreen } from './components/LoadingScreen';
import { SubmittedScreen } from './components/SubmittedScreen';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center" style={{ backgroundColor: 'var(--color-page-bg)', color: 'var(--color-text-primary)' }}>
          <div className="max-w-md text-center">
            <h1 className="mb-2 text-lg font-semibold">Something went wrong</h1>
            <p className="mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: 'var(--color-btn-green-bg)', color: 'var(--color-text-on-emphasis)', border: '1px solid var(--color-btn-border)' }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { state } = useReview();
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const sidebarWidthRef = useRef(sidebarWidth);
  sidebarWidthRef.current = sidebarWidth;
  const draggingRef = useRef(false);

  const handleSelectFile = useCallback((path: string) => {
    setActiveFile(path);
    const el = document.getElementById(`file-${encodeURIComponent(path)}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidthRef.current;

    function onMove(ev: MouseEvent) {
      const newWidth = Math.max(200, Math.min(600, startWidth + ev.clientX - startX));
      setSidebarWidth(newWidth);
    }

    function onUp() {
      draggingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  if (!state.session) return <LoadingScreen />;
  if (state.isSubmitted) return <SubmittedScreen />;

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: 'var(--color-page-bg)', color: 'var(--color-text-primary)' }}>
      <ReviewHeader />
      <div className="flex flex-1 overflow-hidden">
        <FileList activeFile={activeFile} onSelectFile={handleSelectFile} width={sidebarWidth} />
        <div
          className="sidebar-resize-handle shrink-0"
          onMouseDown={handleResizeStart}
        />
        <DiffView activeFile={activeFile} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ReviewProvider>
        <AppContent />
      </ReviewProvider>
    </ErrorBoundary>
  );
}
