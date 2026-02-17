import { useState, useCallback } from 'react';
import { ReviewProvider, useReview } from './context/ReviewContext';
import { ReviewHeader } from './components/ReviewHeader';
import { FileList } from './components/FileList';
import { DiffView } from './components/DiffView';
import { LoadingScreen } from './components/LoadingScreen';
import { SubmittedScreen } from './components/SubmittedScreen';

function AppContent() {
  const { state } = useReview();
  const [activeFile, setActiveFile] = useState<string | null>(null);

  const handleSelectFile = useCallback((path: string) => {
    setActiveFile(path);
    const el = document.getElementById(`file-${encodeURIComponent(path)}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (!state.review) return <LoadingScreen />;
  if (state.isSubmitted) return <SubmittedScreen />;

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-gray-200">
      <ReviewHeader />
      <div className="flex flex-1 overflow-hidden">
        <FileList activeFile={activeFile} onSelectFile={handleSelectFile} />
        <DiffView activeFile={activeFile} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReviewProvider>
      <AppContent />
    </ReviewProvider>
  );
}
