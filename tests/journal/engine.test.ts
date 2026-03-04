/**
 * 仕訳エンジンのテスト（実行: npx tsx tests/journal/engine.test.ts）
 */

import { createAndNormalize, getTotals, validateJournalEntry } from '../../src/journal/index.js';
import type { JournalEntry } from '../../src/types/index.js';

const validEntry: JournalEntry = {
  date: '2025-03-04',
  description: 'オフィス用品購入',
  lines: [
    { side: 'debit', account: 'expense_office', amount: 5500 },
    { side: 'credit', account: 'cash', amount: 5500 },
  ],
};

const unbalancedEntry: JournalEntry = {
  date: '2025-03-04',
  description: '不正な仕訳',
  lines: [
    { side: 'debit', account: 'expense_office', amount: 1000 },
    { side: 'credit', account: 'cash', amount: 500 },
  ],
};

console.log('--- createAndNormalize (valid) ---');
const result = createAndNormalize(validEntry);
if (result.ok) {
  console.log('OK:', result.entry);
  console.log('Lines order (debit first):', result.entry.lines.map((l) => l.side));
} else {
  console.log('Errors:', result.errors);
}

console.log('\n--- createAndNormalize (unbalanced) ---');
const bad = createAndNormalize(unbalancedEntry);
if (!bad.ok) console.log('Expected errors:', bad.errors);

console.log('\n--- getTotals ---');
console.log('Totals:', getTotals(validEntry));

console.log('\n--- validateJournalEntry (invalid date) ---');
const invalidDate = { ...validEntry, date: '03-04-2025' };
console.log('Errors:', validateJournalEntry(invalidDate));

console.log('\nTests completed.');
