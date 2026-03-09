/**
 * Application Service 層: 仕訳の生成＋保存をまとめるサービス
 * expenseType 文字列から勘定科目（debitAccount）を自動判定する
 */

import type { JournalRepository } from '../storage/journalRepository.js';
import type { JournalRecord } from '../dto/journalRecord.js';
import {
  createJournalEntry,
  type ExpenseType,
  type JournalInput,
  type PaymentMethod,
} from '../journal/simpleEntry.js';
import { toJournalRecord } from '../journal/toJournalRecord.js';

/** キーワードに応じた借方勘定科目 */
const TRANSPORT_KEYWORDS = ['電車', 'JR', '地下鉄', 'バス', 'タクシー'];
const MEETING_KEYWORDS = ['カフェ', '喫茶', 'スタバ', 'コーヒー'];
const SUPPLIES_KEYWORDS = ['Amazon', '文房具', 'ノート', 'ペン'];

/** 既に勘定科目名の場合はそのまま返す */
const KNOWN_ACCOUNTS = ['交通費', '旅費交通費', '会議費', '消耗品費', '雑費', 'その他'] as const;

/**
 * expenseType 文字列から借方勘定科目を判定する
 * キーワード: 電車/JR/地下鉄/バス/タクシー→交通費、カフェ/喫茶/スタバ/コーヒー→会議費、
 * Amazon/文房具/ノート/ペン→消耗品費、それ以外→雑費
 */
export function mapExpenseTypeToAccount(expenseType: string): string {
  const s = expenseType.trim();
  if (KNOWN_ACCOUNTS.includes(s as (typeof KNOWN_ACCOUNTS)[number])) {
    if (s === '旅費交通費' || s === '交通費') return '交通費';
    if (s === 'その他') return '雑費';
    return s;
  }
  const lower = s.toLowerCase();
  if (TRANSPORT_KEYWORDS.some((k) => s.includes(k) || lower.includes(k.toLowerCase())))
    return '交通費';
  if (MEETING_KEYWORDS.some((k) => s.includes(k) || lower.includes(k.toLowerCase())))
    return '会議費';
  if (SUPPLIES_KEYWORDS.some((k) => s.includes(k) || lower.includes(k.toLowerCase())))
    return '消耗品費';
  return '雑費';
}

/** mapExpenseTypeToAccount の戻り値から JournalInput 用の ExpenseType キーへ変換 */
function accountToExpenseTypeKey(account: string): ExpenseType {
  if (account === '消耗品費') return '消耗品';
  return account as ExpenseType;
}

/** createAndSave の入力（expenseType は文字列可） */
export type CreateAndSaveInput = {
  date: string;
  expenseType: string | ExpenseType;
  amount: number;
  paymentMethod: PaymentMethod;
};

export class JournalService {
  constructor(private repository: JournalRepository) {}

  /**
   * 入力から仕訳を生成し、保存して、その保存レコードを返す
   * debitAccount は mapExpenseTypeToAccount(expenseType) で決定する
   */
  async createAndSave(input: CreateAndSaveInput): Promise<JournalRecord> {
    const debitAccount = mapExpenseTypeToAccount(String(input.expenseType));
    const expenseTypeKey = accountToExpenseTypeKey(debitAccount);

    const journalInput: JournalInput = {
      date: input.date,
      expenseType: expenseTypeKey,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
    };

    const entry = createJournalEntry(journalInput);
    const record = toJournalRecord(journalInput, entry);
    record.debitAccount = debitAccount;
    await this.repository.save(record);
    return record;
  }

  /**
   * すべての仕訳レコードを取得
   */
  async getAll(): Promise<JournalRecord[]> {
    return this.repository.findAll();
  }
}
