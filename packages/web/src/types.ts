export type {
  Session,
  FileSummary,
  Comment,
  ReviewResult,
  ServerMessage,
  ClientMessage,
} from '@codechat/cli';

/** Whether a comment or draft spans multiple lines. */
export function isLineRange(item: { line: number; endLine?: number }): boolean {
  return item.endLine !== undefined && item.endLine !== item.line;
}
