# 高精度領収書BOT 拡張仕様（added feature）

## 1. メインエントリ

- **起動**: `npm run start` → `tsx src/server.ts`
- ビルド後は `node dist/server.js` でも可（要 `node --experimental-vm-modules` 等はプロジェクト設定に従う）

## 2. 追加した関数一覧

| 関数 | ファイル | 説明 |
|------|----------|------|
| `preprocessForOcr(imageBuffer)` | `src/infrastructure/imagePreprocess.ts` | グレースケール・コントラスト・シャープ化 |
| `normalizeText(text)` | `src/application/receiptParser.ts` | OCR数字の空白を詰める（"3 4 4"→"344"） |
| `extractVendor(text)` | `src/application/receiptParser.ts` | 店名抽出（セブン→セブンイレブン等）、なければ「不明」 |
| `determineAccount(vendor, text)` | `src/application/receiptParser.ts` | 勘定科目判定（荷造運賃/交通費/消耗品費/雑費） |
| `extractAmount(text)` | `src/application/receiptParser.ts` | 金額抽出（合計/TOTAL/計/円の優先順） |
| `extractDate(text)` | `src/application/receiptParser.ts` | 日付抽出→YYYY-MM-DD、なければ今日 |
| `getDescription(ocrText)` | `src/application/receiptParser.ts` | 摘要（OCR先頭50文字） |
| `buildReceiptRecord(ocrText)` | `src/application/highPrecisionReceiptService.ts` | 上記を組み合わせて ReceiptRecord + hash を生成 |
| `getExistingHashes()` | `src/storage/receiptSheetsRepository.ts` | 登録済み hash 一覧（重複防止） |
| `append(record)` | `src/storage/receiptSheetsRepository.ts` | 高精度領収書1件をスプレッドシートに追加 |

## 3. npm install

```bash
npm install
```

追加パッケージ（既に package.json に記載済み）:

- `sharp` … 画像前処理

## 4. .env 例

```env
LINE_CHANNEL_ACCESS_TOKEN=xxx
LINE_CHANNEL_SECRET=xxx
SPREADSHEET_ID=あなたのスプレッドシートID

GOOGLE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
OPENAI_API_KEY=sk-xxx
```

- **Google認証**: スプレッドシート・Vision 用に `service-account.json` を用意し、`GOOGLE_APPLICATION_CREDENTIALS` にパスを指定するか、`GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY` を設定。

## 5. スプレッドシート列定義

シート名: **Receipts**（既存の Journal とは別シート）

| 列 | 名前 | 説明 |
|----|------|------|
| A | date | 日付（YYYY-MM-DD） |
| B | vendor | 店名 |
| C | account | 勘定科目 |
| D | payment | 支払方法（常に「現金」） |
| E | amount | 金額（数値） |
| F | description | 摘要（OCR先頭50文字） |
| G | hash | sha256(OCR全文)。重複判定に使用 |
| H | ocr_text | OCR全文 |

1行目はヘッダーとして「date」「vendor」「account」「payment」「amount」「description」「hash」「ocr_text」を推奨。

## 6. フォルダ構成（追加分）

```
src/
  application/
    receiptParser.ts          # added: 正規化・店名・科目・金額・日付・摘要
    highPrecisionReceiptService.ts  # added: buildReceiptRecord
  infrastructure/
    imagePreprocess.ts        # added: sharp 前処理
    ocr/
      googleVisionOcrService.ts  # 既存
  storage/
    receiptSheetsRepository.ts    # added: 高精度領収書の保存・hash取得
  dto/
    receiptRecord.ts          # added: ReceiptRecord 型
  server.ts                   # 拡張: 画像時に高精度フローを使用
```

既存の `journalService` / `googleSheetsRepository`（Journal シート）/ `receiptPipelineService` はテキストメッセージ用としてそのまま利用。
