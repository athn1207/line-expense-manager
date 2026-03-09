/**
 * OpenAI API を用いて領収書テキストを解析し、仕訳用データを取得する
 */

import OpenAI from 'openai';

/** 領収書解析結果（仕訳入力に変換可能な形式） */
export interface ReceiptAnalysisResult {
  date: string;
  expenseType: string;
  amount: number;
  paymentMethod: string;
}

const SYSTEM_PROMPT = `あなたは経理アシスタントです。
以下の領収書テキストを読み取り、次のJSON形式で出力してください。

出力は必ず次の形式のみです：
{
  "date": "YYYY-MM-DD",
  "expenseType": "文字列",
  "amount": 数値,
  "paymentMethod": "現金 または クレジットカード"
}`;

/**
 * API レスポンスの文字列から JSON 部分を抽出してパースする
 * マークダウンコードブロック（```json ... ```）で囲まれている場合に対応
 */
function extractAndParseJson(content: string): ReceiptAnalysisResult {
  const trimmed = content.trim();
  const codeBlockMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;

  const parsed = JSON.parse(jsonStr) as unknown;

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('date' in parsed) ||
    !('expenseType' in parsed) ||
    !('amount' in parsed) ||
    !('paymentMethod' in parsed)
  ) {
    throw new Error('APIの応答が指定形式のJSONではありません');
  }

  const date = String(parsed.date);
  const expenseType = String(parsed.expenseType);
  const amount = Number(parsed.amount);
  const paymentMethod = String(parsed.paymentMethod);

  if (!Number.isFinite(amount)) {
    throw new Error('amount は数値である必要があります');
  }

  return { date, expenseType, amount, paymentMethod };
}

export class ReceiptAnalyzer {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (this.client) return this.client;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('環境変数 OPENAI_API_KEY が設定されていません');
    }
    this.client = new OpenAI({ apiKey });
    return this.client;
  }

  /**
   * 領収書テキストを解析し、仕訳用の構造化データを返す
   */
  async analyze(text: string): Promise<ReceiptAnalysisResult> {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw new Error('解析するテキストを入力してください');
    }

    const client = this.getClient();

    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-4.1-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
      });

      const rawContent = completion.choices[0]?.message?.content;
      if (rawContent == null || rawContent.trim() === '') {
        throw new Error('APIから有効な応答が返ってきませんでした');
      }

      return extractAndParseJson(rawContent);
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error(`領収書の解析結果のJSONが不正です: ${(err as Error).message}`);
      }
      if (err instanceof Error) {
        if (err.message.startsWith('環境変数') || err.message.startsWith('解析するテキスト') || err.message.startsWith('APIの応答') || err.message.startsWith('amount') || err.message.startsWith('領収書の解析結果')) {
          throw err;
        }
        throw new Error(`領収書の解析に失敗しました: ${err.message}`);
      }
      throw new Error('領収書の解析に失敗しました');
    }
  }
}
