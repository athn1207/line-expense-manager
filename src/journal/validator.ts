/**
 * 仕訳の検証（複式簿記ルール・行の妥当性）
 * 税額計算は行わない
 */

import type { JournalEntry, JournalLine } from '../types/index.js';
import type { TaxCategory } from '../types/tax.js';

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

/** 税区分として有効な値 */
const VALID_TAX_CATEGORIES: readonly TaxCategory[] = [
  'taxable',
  'reduced',
  'exempt',
  'non_taxable',
] as const;

/** 日付の簡易チェック（YYYY-MM-DD） */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 1行の検証（金額・勘定・税区分）
 */
function validateLine(line: JournalLine, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `lines[${index}]`;

  if (typeof line.amount !== 'number' || !Number.isInteger(line.amount) || line.amount <= 0) {
    errors.push({
      code: 'INVALID_AMOUNT',
      message: '金額は正の整数である必要があります',
      field: `${prefix}.amount`,
    });
  }

  if (!line.account || typeof line.account !== 'string' || line.account.trim() === '') {
    errors.push({
      code: 'INVALID_ACCOUNT',
      message: '勘定科目を指定してください',
      field: `${prefix}.account`,
    });
  }

  if (line.side !== 'debit' && line.side !== 'credit') {
    errors.push({
      code: 'INVALID_SIDE',
      message: 'side は debit または credit です',
      field: `${prefix}.side`,
    });
  }

  if (
    line.taxCategory != null &&
    !VALID_TAX_CATEGORIES.includes(line.taxCategory as TaxCategory)
  ) {
    errors.push({
      code: 'INVALID_TAX_CATEGORY',
      message: `税区分は ${VALID_TAX_CATEGORIES.join(', ')} のいずれかです`,
      field: `${prefix}.taxCategory`,
    });
  }

  return errors;
}

/**
 * 仕訳全体の検証（複式バランス・日付・行数）
 */
export function validateJournalEntry(entry: JournalEntry): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!entry.date || !DATE_REGEX.test(entry.date)) {
    errors.push({
      code: 'INVALID_DATE',
      message: '日付は YYYY-MM-DD 形式で指定してください',
      field: 'date',
    });
  }

  if (!entry.lines || !Array.isArray(entry.lines) || entry.lines.length === 0) {
    errors.push({
      code: 'NO_LINES',
      message: '仕訳行が1行以上必要です',
      field: 'lines',
    });
  } else {
    entry.lines.forEach((line, i) => {
      errors.push(...validateLine(line, i));
    });

    const debitTotal = entry.lines
      .filter((l) => l.side === 'debit')
      .reduce((sum, l) => sum + l.amount, 0);
    const creditTotal = entry.lines
      .filter((l) => l.side === 'credit')
      .reduce((sum, l) => sum + l.amount, 0);

    if (debitTotal !== creditTotal) {
      errors.push({
        code: 'UNBALANCED',
        message: `借方合計(${debitTotal})と貸方合計(${creditTotal})が一致しません`,
        field: 'lines',
      });
    }
  }

  return errors;
}

/**
 * 仕訳が有効かどうか
 */
export function isValidJournalEntry(entry: JournalEntry): boolean {
  return validateJournalEntry(entry).length === 0;
}
