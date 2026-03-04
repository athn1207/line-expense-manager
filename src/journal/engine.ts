/**
 * 仕訳エンジン: 仕訳の作成・検証・正規化
 * I/O（Sheets・LINE・OCR）は含めない
 */

import type {
  JournalEntry,
  JournalLine,
  NormalizedJournalEntry,
} from '../types/index.js';
import {
  validateJournalEntry,
  type ValidationError,
} from './validator.js';

export type { ValidationError };

/**
 * 仕訳を正規化する（行順: 借方 → 貸方）
 */
function normalizeLines(lines: JournalLine[]): JournalLine[] {
  const debit = lines.filter((l) => l.side === 'debit');
  const credit = lines.filter((l) => l.side === 'credit');
  return [...debit, ...credit];
}

/**
 * 仕訳を検証し、正規化して返す。
 * 検証エラーがある場合は null とエラー配列を返す。
 */
export function createAndNormalize(entry: JournalEntry): {
  ok: true;
  entry: NormalizedJournalEntry;
} | {
  ok: false;
  errors: ValidationError[];
} {
  const errors = validateJournalEntry(entry);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const normalized: NormalizedJournalEntry = {
    ...entry,
    lines: normalizeLines(entry.lines),
    _normalized: true,
  };
  return { ok: true, entry: normalized };
}

/**
 * 借方合計・貸方合計を算出（税額は計算しない）
 */
export function getTotals(entry: JournalEntry): { debit: number; credit: number } {
  const debit = entry.lines
    .filter((l) => l.side === 'debit')
    .reduce((sum, l) => sum + l.amount, 0);
  const credit = entry.lines
    .filter((l) => l.side === 'credit')
    .reduce((sum, l) => sum + l.amount, 0);
  return { debit, credit };
}
