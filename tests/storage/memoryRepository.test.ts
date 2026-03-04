/**
 * MemoryRepository のテスト
 * 実行: npx tsx tests/storage/memoryRepository.test.ts
 */

import assert from 'node:assert';
import { MemoryRepository } from '../../src/storage/memoryRepository.js';
import type { JournalRecord } from '../../src/dto/journalRecord.js';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('MemoryRepository');

test('save すると findAll に1件入る', () => {
  const repo = new MemoryRepository();
  const record: JournalRecord = {
    date: '2025-03-04',
    debitAccount: '旅費交通費',
    creditAccount: '現金',
    debitAmount: 1500,
    creditAmount: 1500,
  };
  repo.save(record);
  const all = repo.findAll();
  assert.strictEqual(all.length, 1);
  assert.strictEqual(all[0].debitAccount, '旅費交通費');
  assert.strictEqual(all[0].creditAccount, '現金');
});

test('複数保存できる', () => {
  const repo = new MemoryRepository();
  repo.save({
    date: '2025-03-01',
    debitAccount: '通信費',
    creditAccount: '未払金',
    debitAmount: 5500,
    creditAmount: 5500,
  });
  repo.save({
    date: '2025-03-04',
    debitAccount: '消耗品費',
    creditAccount: '現金',
    debitAmount: 3200,
    creditAmount: 3200,
  });
  const all = repo.findAll();
  assert.strictEqual(all.length, 2);
  assert.strictEqual(all[0].date, '2025-03-01');
  assert.strictEqual(all[1].date, '2025-03-04');
});

test('date も保存される', () => {
  const repo = new MemoryRepository();
  const record: JournalRecord = {
    date: '2025-12-31',
    debitAccount: 'その他',
    creditAccount: '現金',
    debitAmount: 100,
    creditAmount: 100,
  };
  repo.save(record);
  const all = repo.findAll();
  assert.strictEqual(all[0].date, '2025-12-31');
});

test('debit/credit 金額一致確認', () => {
  const repo = new MemoryRepository();
  const record: JournalRecord = {
    date: '2025-03-04',
    debitAccount: '水道光熱費',
    creditAccount: '未払金',
    debitAmount: 8000,
    creditAmount: 8000,
  };
  repo.save(record);
  const all = repo.findAll();
  assert.strictEqual(all[0].debitAmount, all[0].creditAmount);
  assert.strictEqual(all[0].debitAmount, 8000);
});

console.log('\nAll tests passed.');
