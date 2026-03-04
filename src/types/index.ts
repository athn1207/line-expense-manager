/**
 * ドメイン型の再エクスポート
 * LINE・Sheets・Vision などから共通で参照する
 */

export type {
  AccountCategory,
  AccountCode,
  AccountMasterItem,
  DebitCredit,
} from './account.js';

export type { TaxCategory } from './tax.js';
export { TAX_CATEGORY_LABELS } from './tax.js';

export type {
  JournalEntry,
  JournalLine,
  NormalizedJournalEntry,
} from './journal.js';
