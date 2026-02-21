import { getChangeKey } from 'react-diff-view';

// We use `any` for change/hunk types since react-diff-view's internal
// types don't perfectly align with their runtime structures.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyChange = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHunk = any;

/**
 * Build a lookup from "side:line" to changeKey for all changes in hunks.
 */
export function buildChangeKeyMap(hunks: AnyHunk[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const hunk of hunks) {
    for (const change of hunk.changes) {
      const key = getChangeKey(change);
      if (change.type === 'insert') {
        map.set(`new:${change.lineNumber}`, key);
      } else if (change.type === 'delete') {
        map.set(`old:${change.lineNumber}`, key);
      } else if (change.type === 'normal') {
        map.set(`new:${change.newLineNumber}`, key);
        map.set(`old:${change.oldLineNumber}`, key);
      }
    }
  }
  return map;
}

/**
 * Get changeKeys for all lines in a range on a given side.
 */
export function getChangeKeysInRange(
  hunks: AnyHunk[],
  side: 'old' | 'new',
  startLine: number,
  endLine: number,
): string[] {
  const keys: string[] = [];
  for (const hunk of hunks) {
    for (const change of hunk.changes) {
      const key = getChangeKey(change);
      let lineNum: number | undefined;
      if (side === 'new') {
        if (change.type === 'insert') lineNum = change.lineNumber;
        else if (change.type === 'normal') lineNum = change.newLineNumber;
      } else {
        if (change.type === 'delete') lineNum = change.lineNumber;
        else if (change.type === 'normal') lineNum = change.oldLineNumber;
      }
      if (lineNum !== undefined && lineNum >= startLine && lineNum <= endLine) {
        keys.push(key);
      }
    }
  }
  return keys;
}

/**
 * Extract (line, side) info from a change object for creating a Comment.
 */
export function changeToLineInfo(change: AnyChange): { line: number; side: 'old' | 'new' } {
  if (change.type === 'insert') return { line: change.lineNumber, side: 'new' };
  if (change.type === 'delete') return { line: change.lineNumber, side: 'old' };
  return { line: change.newLineNumber, side: 'new' };
}
