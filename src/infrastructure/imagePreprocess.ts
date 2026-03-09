/**
 * OCR精度向上のための画像前処理（added feature）
 * sharp で グレースケール / コントラスト強化 / シャープ化
 */

import sharp from 'sharp';

/** OCR前に画像を前処理し、バイナリを返す */
export async function preprocessForOcr(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .grayscale()
    .normalize()
    .sharpen()
    .toBuffer();
}
