/**
 * Google Cloud Vision API を用いた OCR サービス
 * 画像バイナリ → テキスト抽出
 *
 * 認証（どちらか一方でOK）:
 * - GOOGLE_APPLICATION_CREDENTIALS: サービスアカウントJSONのパス（ローカル）
 * - GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY: 環境変数（Render など JSON が置けない環境）
 */

import { ImageAnnotatorClient } from '@google-cloud/vision';

function createVisionClient(): ImageAnnotatorClient {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    return new ImageAnnotatorClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
    });
  }
  return new ImageAnnotatorClient();
}

export class GoogleVisionOcrService {
  private client: ImageAnnotatorClient;

  constructor() {
    this.client = createVisionClient();
  }

  /**
   * 画像バイナリからテキストを抽出する
   * @param imageBuffer 画像のバイナリデータ
   * @returns 抽出された全文テキスト。読み取れない場合は空文字
   */
  async extractText(imageBuffer: Buffer): Promise<string> {
    const [result] = await this.client.textDetection({
      image: { content: imageBuffer },
    });
    const text = result.fullTextAnnotation?.text?.trim() ?? '';
    return text;
  }
}
