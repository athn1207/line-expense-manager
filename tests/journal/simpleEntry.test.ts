/**
 * 簡易仕訳エンジン createJournalEntry のテスト
 * 実行: npx tsx tests/journal/simpleEntry.test.ts
 */

import assert from 'node:assert';
import { createJournalEntry } from '../../src/journal/simpleEntry.js';
import type { JournalInput } from '../../src/journal/simpleEntry.js';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('createJournalEntry');

// --- 正常系 ---

test('expenseType 交通費 → 借方 旅費交通費', () => {
  const input: JournalInput = {
    date: '2025-03-04',
    expenseType: '交通費',
    amount: 1500,
    paymentMethod: '現金',
  };
  const out = createJournalEntry(input);
  assert.strictEqual(out.debitAccount, '旅費交通費');
  assert.strictEqual(out.creditAccount, '現金');
  assert.strictEqual(out.debitAmount, 1500);
  assert.strictEqual(out.creditAmount, 1500);
});

test('expenseType 消耗品 → 借方 消耗品費', () => {
  const input: JournalInput = {
    date: '2025-03-04',
    expenseType: '消耗品',
    amount: 3200,
    paymentMethod: '現金',
  };
  const out = createJournalEntry(input);
  assert.strictEqual(out.debitAccount, '消耗品費');
  assert.strictEqual(out.creditAccount, '現金');
  assert.strictEqual(out.debitAmount, 3200);
  assert.strictEqual(out.creditAmount, 3200);
});

test('expenseType 通信費 → 借方 通信費', () => {
  const input: JournalInput = {
    date: '2025-03-01',
    expenseType: '通信費',
    amount: 5500,
    paymentMethod: 'クレカ',
  };
  const out = createJournalEntry(input);
  assert.strictEqual(out.debitAccount, '通信費');
  assert.strictEqual(out.creditAccount, '未払金');
  assert.strictEqual(out.debitAmount, 5500);
  assert.strictEqual(out.creditAmount, 5500);
});

test('paymentMethod 現金 → 貸方 現金', () => {
  const input: JournalInput = {
    date: '2025-03-04',
    expenseType: 'その他',
    amount: 1000,
    paymentMethod: '現金',
  };
  const out = createJournalEntry(input);
  assert.strictEqual(out.creditAccount, '現金');
});

test('paymentMethod クレカ → 貸方 未払金', () => {
  const input: JournalInput = {
    date: '2025-03-04',
    expenseType: '接待交際費',
    amount: 5000,
    paymentMethod: 'クレカ',
  };
  const out = createJournalEntry(input);
  assert.strictEqual(out.creditAccount, '未払金');
});

test('借方貸方同額', () => {
  const input: JournalInput = {
    date: '2025-03-04',
    expenseType: '水道光熱費',
    amount: 8000,
    paymentMethod: 'クレカ',
  };
  const out = createJournalEntry(input);
  assert.strictEqual(out.debitAmount, out.creditAmount);
  assert.strictEqual(out.debitAmount, 8000);
});

test('小数の金額は許可する（将来消費税対応）', () => {
  const input: JournalInput = {
    date: '2025-03-04',
    expenseType: '消耗品',
    amount: 1100.5,
    paymentMethod: '現金',
  };
  const out = createJournalEntry(input);
  assert.strictEqual(out.debitAmount, 1100.5);
  assert.strictEqual(out.creditAmount, 1100.5);
});

// --- 異常系: 金額バリデーション ---

test('amount = 0 のときエラー', () => {
  const input: JournalInput = {
    date: '2025-03-04',
    expenseType: '交通費',
    amount: 0,
    paymentMethod: '現金',
  };
  assert.throws(
    () => createJournalEntry(input),
    (err: Error) => {
      assert.strictEqual(err.message, '金額は0より大きい必要があります');
      return true;
    }
  );
});

test('amount = -100 のときエラー', () => {
  const input: JournalInput = {
    date: '2025-03-04',
    expenseType: '通信費',
    amount: -100,
    paymentMethod: 'クレカ',
  };
  assert.throws(
    () => createJournalEntry(input),
    (err: Error) => {
      assert.strictEqual(err.message, '金額は0より大きい必要があります');
      return true;
    }
  );
});

// --- 異常系: 日付バリデーション ---

test('不正な日付（2025/03/04）のときエラー', () => {
  const input: JournalInput = {
    date: '2025/03/04',
    expenseType: '交通費',
    amount: 1500,
    paymentMethod: '現金',
  };
  assert.throws(
    () => createJournalEntry(input),
    (err: Error) => {
      assert.strictEqual(err.message, '日付はYYYY-MM-DD形式で入力してください');
      return true;
    }
  );
});

test('日付が空文字のときエラー', () => {
  const input: JournalInput = {
    date: '',
    expenseType: 'その他',
    amount: 100,
    paymentMethod: '現金',
  };
  assert.throws(
    () => createJournalEntry(input),
    (err: Error) => {
      assert.strictEqual(err.message, '日付はYYYY-MM-DD形式で入力してください');
      return true;
    }
  );
});

console.log('\nAll tests passed.');
