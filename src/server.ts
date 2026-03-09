/**
 * LINE BOT Webhook サーバー
 * テキストまたは領収書画像を受け取り、解析→仕訳→Google Sheets 保存
 * 実行: npm run start または npx tsx src/server.ts
 */

import 'dotenv/config';
import express from 'express';
import { Client, middleware } from '@line/bot-sdk';
import type { Readable } from 'node:stream';
import { ReceiptPipelineService } from './application/receiptPipelineService.js';
import { JournalService } from './application/journalService.js';
import { GoogleSheetsRepository } from './storage/googleSheetsRepository.js';
import { GoogleVisionOcrService } from './infrastructure/ocr/googleVisionOcrService.js';
// added feature: 高精度領収書（画像前処理・OCR正規化・重複防止・新スプレッドシート列）
import { preprocessForOcr } from './infrastructure/imagePreprocess.js';
import { buildReceiptRecord } from './application/highPrecisionReceiptService.js';
import { ReceiptSheetsRepository } from './storage/receiptSheetsRepository.js';
import { saveOcrLog } from './infrastructure/ocrLogWriter.js';

const PORT = 3000;
const spreadsheetId = process.env.SPREADSHEET_ID ?? '14zc49qa_n_I_ZkNAyIbTAebDOX_pkh7hr1rRr9Uprmc';
const sheetName = 'Journal';
/** 領収書記録用シート名。スプレッドシートのタブ名と完全一致させる（未設定時は Receipts） */
const receiptSheetName = process.env.RECEIPT_SHEET_NAME ?? 'Receipts';

const channelSecret = process.env.LINE_CHANNEL_SECRET;
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

if (!channelSecret || !channelAccessToken) {
  console.error('環境変数 LINE_CHANNEL_SECRET と LINE_CHANNEL_ACCESS_TOKEN を設定してください');
  process.exit(1);
}

const lineConfig = { channelSecret, channelAccessToken };
const client = new Client(lineConfig);

const repo = new GoogleSheetsRepository(spreadsheetId, sheetName);
const journalService = new JournalService(repo);
const pipelineService = new ReceiptPipelineService(journalService);
const ocrService = new GoogleVisionOcrService();
const receiptSheetsRepo = new ReceiptSheetsRepository(spreadsheetId, receiptSheetName);

/** LINE の getMessageContent が返すストリームを Buffer に変換 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer | Uint8Array) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

type WebhookEvent = {
  type: string;
  replyToken: string;
  message?: {
    type: string;
    text?: string;
    id?: string;
  };
};

const app = express();

// LINE Webhook では middleware が body をパースするため、ここでは express.json() を使わない
app.post(
  '/webhook',
  middleware(lineConfig),
  (req, res) => {
    res.status(200).send('OK');

    const events = (req.body?.events ?? []) as WebhookEvent[];
    if (!events.length) return;

    for (const event of events) {
      if (event.type !== 'message' || !event.message) continue;

      if (event.message.type === 'text') {
        const text = (event.message.text ?? '').trim();
        console.log('受信メッセージ:', text);
        if (!text) {
          void client.replyMessage(event.replyToken, { type: 'text', text: '領収書の内容を送信してください' });
          continue;
        }
        void (async () => {
          try {
            await pipelineService.process(text);
            await client.replyMessage(event.replyToken, { type: 'text', text: '領収書を登録しました' });
          } catch (error) {
            await client.replyMessage(event.replyToken, { type: 'text', text: '処理に失敗しました' });
          }
        })();
        continue;
      }

      if (event.message.type === 'image') {
        console.log('画像メッセージ受信');
        const messageId = event.message.id;
        if (!messageId) continue;
        void (async () => {
          try {
            const stream = await client.getMessageContent(messageId);
            const imageBuffer = await streamToBuffer(stream as Readable);
            const preprocessed = await preprocessForOcr(imageBuffer);
            const ocrTextRaw = await ocrService.extractText(preprocessed);
            if (!ocrTextRaw) {
              await client.replyMessage(event.replyToken, { type: 'text', text: '領収書を読み取れませんでした' });
              return;
            }

            let record = buildReceiptRecord(ocrTextRaw);
            let receiptDate = record.date;
            let storeName = record.vendor;
            let amount = record.amount;

            if (!receiptDate) receiptDate = '未取得';
            if (!storeName) storeName = '不明店舗';
            if (amount == null || amount === undefined) amount = 0;

            record = { ...record, date: receiptDate, vendor: storeName, amount };

            const sheetData = await receiptSheetsRepo.getExistingRows();
            if (receiptSheetsRepo.isDuplicate(sheetData, receiptDate, storeName, amount)) {
              console.log('Duplicate receipt detected');
              await client.replyMessage(event.replyToken, { type: 'text', text: 'この領収書は既に登録されています' });
              return;
            }

            await receiptSheetsRepo.append(record);

            saveOcrLog({
              timestamp: new Date().toISOString(),
              storeName,
              receiptDate,
              amount,
              ocrText: ocrTextRaw,
            });

            const dateDisplay = receiptDate.replace(/-/g, '/');
            const replyText = [
              '登録しました',
              `${dateDisplay} | ${storeName} | ${record.account} | ${record.payment} | ${amount}円`,
            ].join('\n');
            await client.replyMessage(event.replyToken, { type: 'text', text: replyText });
          } catch (error) {
            console.error('receipt image error:', error);
            await client.replyMessage(event.replyToken, { type: 'text', text: '領収書を読み取れませんでした' });
          }
        })();
      }
    }
  }
);

app.listen(PORT, () => {
  console.log('LINE BOT server running on port', PORT);
});