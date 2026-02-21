import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { changeToLineInfo, getChangeKeysInRange } from '../utils/changeKeyMapping';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHunk = any;

interface DragState {
  anchorLine: number;
  currentLine: number;
  side: 'old' | 'new';
}

interface DragRange {
  startLine: number;
  endLine: number;
  side: 'old' | 'new';
}

interface UseGutterDragOptions {
  hunks: AnyHunk[];
  onSelect: (side: 'old' | 'new', startLine: number, endLine: number) => void;
}

export function useGutterDrag({ hunks, onSelect }: UseGutterDragOptions) {
  const dragRef = useRef<DragState | null>(null);
  const [dragRange, setDragRange] = useState<DragRange | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onMouseDown = useCallback((arg: any, event: MouseEvent) => {
    const change = arg.change ?? arg;
    if (!change) return;
    event.preventDefault(); // suppress text selection
    const info = changeToLineInfo(change);
    dragRef.current = { anchorLine: info.line, currentLine: info.line, side: info.side };
    setDragRange({ startLine: info.line, endLine: info.line, side: info.side });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onMouseEnter = useCallback((arg: any) => {
    if (!dragRef.current) return;
    const change = arg.change ?? arg;
    if (!change) return;
    const info = changeToLineInfo(change);
    // Only track movement on the same side
    if (info.side !== dragRef.current.side) return;
    dragRef.current.currentLine = info.line;
    const min = Math.min(dragRef.current.anchorLine, info.line);
    const max = Math.max(dragRef.current.anchorLine, info.line);
    setDragRange({ startLine: min, endLine: max, side: dragRef.current.side });
  }, []);

  useEffect(() => {
    function handleMouseUp() {
      const drag = dragRef.current;
      if (!drag) return;
      const startLine = Math.min(drag.anchorLine, drag.currentLine);
      const endLine = Math.max(drag.anchorLine, drag.currentLine);
      dragRef.current = null;
      setDragRange(null);
      onSelectRef.current(drag.side, startLine, endLine);
    }
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const selectedChanges = useMemo(() => {
    if (!dragRange) return [];
    return getChangeKeysInRange(hunks, dragRange.side, dragRange.startLine, dragRange.endLine);
  }, [hunks, dragRange]);

  const gutterEvents = useMemo(
    () => ({ onMouseDown, onMouseEnter }),
    [onMouseDown, onMouseEnter],
  );

  return { gutterEvents, selectedChanges };
}
