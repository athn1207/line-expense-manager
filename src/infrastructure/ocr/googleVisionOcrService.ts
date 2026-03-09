/**
 * Google Cloud Vision API を用いた OCR サービス
 * 画像バイナリ → テキスト抽出
 * 環境変数 GOOGLE_APPLICATION_CREDENTIALS でサービスアカウントJSONのパスを指定する
 */

import { ImageAnnotatorClient } from '@google-cloud/vision';

export class GoogleVisionOcrService {
  private client: ImageAnnotatorClient;

  constructor() {
    this.client = new ImageAnnotatorClient();
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
