# LINE 経費管理ツール（仕訳エンジン）

個人事業主向け・LINEで経費管理。青色申告対応・複式簿記・Google Sheets 保存を前提に、まず**仕訳エンジンのみ**を実装しています。

## 技術スタック（予定）

- Node.js / TypeScript / Express
- LINE Messaging API / Google Sheets API / Google Cloud Vision API

## フォルダ構成

```
src/
  types/       # 勘定科目・仕訳・税区分の型定義
  journal/     # 仕訳エンジン（作成・検証・正規化）
  (将来) line/, sheets/, vision/
```

詳細は [docs/DESIGN.md](docs/DESIGN.md) を参照してください。

## セットアップ

```bash
npm install
npm run build
npm test
```

## 仕訳エンジンの使い方

```ts
import { createAndNormalize, getTotals } from './src/journal/index.js';
import type { JournalEntry } from './src/types/index.js';

const entry: JournalEntry = {
  date: '2025-03-04',
  description: 'オフィス用品',
  lines: [
    { side: 'debit', account: 'expense_office', amount: 5500 },
    { side: 'credit', account: 'cash', amount: 5500 },
  ],
};

const result = createAndNormalize(entry);
if (result.ok) {
  console.log(result.entry);  // 正規化済み仕訳
  console.log(getTotals(result.entry));  // { debit: 5500, credit: 5500 }
} else {
  console.log(result.errors);  // 検証エラー
}
```

## ライセンス

MIT
