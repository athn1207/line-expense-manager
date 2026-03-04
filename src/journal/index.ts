/**
 * 仕訳エンジン
 * - 簡易仕訳: createJournalEntry (青色申告・入力→出力変換)
 * - 汎用仕訳: 作成・検証・正規化、複式簿記ルール
 */

export {
  createJournalEntry,
  EXPENSE_TYPE_TO_DEBIT_ACCOUNT,
  PAYMENT_METHOD_TO_CREDIT_ACCOUNT,
  type JournalInput,
  type JournalEntry as SimpleJournalEntry,
  type ExpenseType,
  type PaymentMethod,
} from './simpleEntry.js';
export { createAndNormalize, getTotals, type ValidationError } from './engine.js';
export { validateJournalEntry, isValidJournalEntry } from './validator.js';
