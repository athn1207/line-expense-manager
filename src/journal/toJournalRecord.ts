/**
 * JournalEntry → JournalRecord 変換（保存用DTOへ）
 * date は input から取得する
 */

import type { JournalRecord } from '../dto/journalRecord.js';
import type { JournalEntry, JournalInput } from './simpleEntry.js';

export function toJournalRecord(
  input: JournalInput,
  entry: JournalEntry
): JournalRecord {
  return {
    date: input.date,
    debitAccount: entry.debitAccount,
    creditAccount: entry.creditAccount,
    debitAmount: entry.debitAmount,
    creditAmount: entry.creditAmount,
  };
}
