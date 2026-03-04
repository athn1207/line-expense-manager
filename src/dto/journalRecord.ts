/**
 * 保存用DTO（JournalEntry とは別の型）
 */

export interface JournalRecord {
  date: string;
  debitAccount: string;
  creditAccount: string;
  debitAmount: number;
  creditAmount: number;
}
