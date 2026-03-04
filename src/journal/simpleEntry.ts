/**
 * 青色申告対応・簡易仕訳エンジン
 * JournalInput → JournalEntry の変換（科目マッピング・支払方法で貸方決定）
 */

/** 日付の簡易チェック（YYYY-MM-DD） */
const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** expenseType → 借方科目（青色申告の勘定科目名） */
export const EXPENSE_TYPE_TO_DEBIT_ACCOUNT = {
  交通費: '旅費交通費',
  消耗品: '消耗品費',
  通信費: '通信費',
  接待交際費: '接待交際費',
  支払手数料: '支払手数料',
  新聞図書費: '新聞図書費',
  広告宣伝費: '広告宣伝費',
  外注費: '外注費',
  修繕費: '修繕費',
  水道光熱費: '水道光熱費',
  旅費交通費: '旅費交通費',
  その他: 'その他',
} as const;

/** paymentMethod → 貸方科目 */
export const PAYMENT_METHOD_TO_CREDIT_ACCOUNT = {
  現金: '現金',
  クレカ: '未払金',
} as const;

export type ExpenseType = keyof typeof EXPENSE_TYPE_TO_DEBIT_ACCOUNT;
export type PaymentMethod = keyof typeof PAYMENT_METHOD_TO_CREDIT_ACCOUNT;

/** 簡易仕訳の入力 */
export interface JournalInput {
  date: string;
  expenseType: ExpenseType;
  amount: number;
  paymentMethod: PaymentMethod;
}

/** 簡易仕訳の出力（1伝票＝借方1行・貸方1行） */
export interface JournalEntry {
  debitAccount: string;
  creditAccount: string;
  debitAmount: number;
  creditAmount: number;
}

/**
 * 入力から仕訳（借方・貸方科目・同額）を生成する
 * - amount が 0 以下なら Error を throw
 * - date が YYYY-MM-DD 形式でないなら Error を throw
 */
export function createJournalEntry(input: JournalInput): JournalEntry {
  if (input.amount <= 0) {
    throw new Error('金額は0より大きい必要があります');
  }

  if (!DATE_ISO_REGEX.test(input.date)) {
    throw new Error('日付はYYYY-MM-DD形式で入力してください');
  }

  const debitAccount = EXPENSE_TYPE_TO_DEBIT_ACCOUNT[input.expenseType];
  const creditAccount = PAYMENT_METHOD_TO_CREDIT_ACCOUNT[input.paymentMethod];
  const amount = input.amount;

  return {
    debitAccount,
    creditAccount,
    debitAmount: amount,
    creditAmount: amount,
  };
}
