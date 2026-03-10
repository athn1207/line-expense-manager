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
import { GoogleVisionOcrService } from './infrastructure/ocr/googleVisionOcrService.js';
// added feature: 高精度領収書（画像前処理・OCR正規化・重複防止・新スプレッドシート列）
import { preprocessForOcr } from './infrastructure/imagePreprocess.js';
import { buildReceiptRecord } from './application/highPrecisionReceiptService.js';
import { saveOcrLog } from './infrastructure/ocrLogWriter.js';
import { GoogleSheetsRepository } from './storage/googleSheetsRepository.js';
import { UserSheetsRepository } from './storage/userSheetsRepository.js';

const PORT = Number(process.env.PORT ?? 3000);
const spreadsheetId = process.env.SPREADSHEET_ID ?? '14zc49qa_n_I_ZkNAyIbTAebDOX_pkh7hr1rRr9Uprmc';
const sheetName = 'Journal';

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
const userDbSheetName = process.env.USER_DB_SHEET_NAME ?? 'user_db';
// ユーザー専用タブと user_db は、メインの SPREADSHEET_ID 内で管理する
const userSheetsRepo = new UserSheetsRepository(spreadsheetId, userDbSheetName);

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
  source?: {
    userId?: string;
  };
  message?: {
    type: string;
    text?: string;
    id?: string;
  };
};

const app = express();

// Render 健康チェック用
app.get('/', (_req, res) => {
  res.send('BOT RUNNING');
});

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
            const userId = event.source?.userId;

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

            // ユーザー専用タブを取得（なければ作成）＋ user_db 登録
            if (!userId) {
              throw new Error('userId が取得できませんでした');
            }
            const { sheetName, isNew } = await userSheetsRepo.getOrCreateUserSheet(userId);

            // 重複チェック（同一ユーザーの同一タブ内で、日付+店名+金額 が同じか）
            const sheetData = await userSheetsRepo.getUserSheetRows(sheetName);
            if (userSheetsRepo.isDuplicate(sheetData, receiptDate, storeName, amount)) {
              console.log('Duplicate receipt detected');
              await client.replyMessage(event.replyToken, { type: 'text', text: 'このレシートはすでに登録されています' });
              return;
            }

            await userSheetsRepo.appendReceiptRow(sheetName, {
              date: receiptDate,
              storeName,
              account: String(record.account ?? ''),
              payment: String(record.payment ?? ''),
              amount,
            });

            saveOcrLog({
              timestamp: new Date().toISOString(),
              storeName,
              receiptDate,
              amount,
              ocrText: ocrTextRaw,
            });

            const dateDisplay = receiptDate.replace(/-/g, '/');
            const replyText = [
              '経費を記録しました',
              '',
              `日付: ${dateDisplay}`,
              `店名: ${storeName}`,
              `金額: ${amount}円`,
            ].join('\n');

            // レシート登録結果
            await client.replyMessage(event.replyToken, { type: 'text', text: replyText });

            // 初回ユーザーの場合のみ、専用タブ作成メッセージを追加送信
            if (isNew && userId) {
              const newUserText = [
                'あなた専用の経費シートを作成しました',
                '',
                'Googleスプレッドシート内に',
                'あなた専用タブを作成しています',
              ].join('\n');
              await client.pushMessage(userId, { type: 'text', text: newUserText });
            }
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