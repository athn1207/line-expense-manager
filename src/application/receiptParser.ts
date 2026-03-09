/**
 * 領収書OCR解析（店舗辞書・金額検出・日付検出・店舗学習）
 */

/** 店舗辞書（リユース店舗含む）。先にマッチしたキーワードを店名として使用 */
export const storeKeywords = [
  'セカンドストリート',
  '2nd STREET',
  'セカスト',
  'ブックオフ',
  'BOOKOFF',
  'ハードオフ',
  'HARD OFF',
  'オフハウス',
  'トレジャーファクトリー',
  'トレファク',
  'キングファミリー',
  'モードオフ',
  '駿河屋',
  'まんだらけ',
  'セブンイレブン',
  'セブン',
  'ローソン',
  'ファミリーマート',
  'ファミマ',
  'ミニストップ',
  'スターバックス',
  'スタバ',
  'ドトール',
  'タリーズ',
  'マクドナルド',
  '吉野家',
  'すき家',
  '松屋',
  'Amazon',
  'AMAZON',
  '楽天',
  'RAKUTEN',
  'ヨドバシ',
  'ビックカメラ',
  '日本郵便',
  '郵便局',
];

/** OCRテキストを改行で分割し、トリム・空行除去 */
export function shapeOcrLines(ocrText: string): string[] {
  return ocrText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/**
 * 店名判定：①店舗辞書（上部5行内を優先） ②上部10行の「先頭の有効行」 ③レシート支払い
 */
export function extractStoreName(ocrText: string): string {
  const lines = shapeOcrLines(ocrText);
  const topText = lines.slice(0, 5).join('\n');

  let storeName = '';
  for (const keyword of storeKeywords) {
    if (!ocrText.includes(keyword)) continue;
    if (topText.includes(keyword)) {
      storeName = keyword;
      break;
    }
    if (!storeName) storeName = keyword;
  }

  if (!storeName) {
    const topLines = lines.slice(0, 10);
    const skipPattern = /^(領収書|領収証|日付|合計|小計|税|￥|¥|TEL|〒|\d+円|取扱|発行|様|番地|丁目|号室|登録)/;
    for (const line of topLines) {
      if (
        line.length < 2 ||
        line.length > 30 ||
        /^\d+$/.test(line) ||
        line.includes('TEL') ||
        line.includes('〒') ||
        skipPattern.test(line) ||
        /^\d/.test(line)
      )
        continue;
      storeName = line.trim();
      break;
    }
  }

  if (!storeName) {
    storeName = 'レシート支払い';
  }
  return storeName;
}

/** 金額検出用：全角数字→半角 */
function normalizeForAmount(text: string): string {
  return text.replace(/[０-９]/g, (c) => String(c.charCodeAt(0) - 0xfee0));
}

const TOTAL_KEYWORDS = [
  '合計',
  '合計金額',
  'TOTAL',
  'Total',
  'お会計',
  'ご請求',
];

function getPrice(line: string): number | null {
  if (
    line.includes('税') ||
    line.includes('税率') ||
    line.includes('%') ||
    line.includes('消費税')
  ) {
    return null;
  }

  const match = line.match(/\d{1,3}(,\d{3})*|\d+/);
  if (!match) return null;

  const price = parseInt(match[0].replace(/,/g, ''), 10);
  if (price < 100) return null;

  return price;
}

/**
 * 金額検出：合計キーワードを含む行の前後3行の範囲で数値を集め、最大値を返す。
 */
export function extractAmount(ocrText: string): number {
  const t = normalizeForAmount(ocrText);
  const lines = t
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!TOTAL_KEYWORDS.some((k) => line.includes(k))) continue;

    const prices: number[] = [];
    for (let j = i - 3; j <= i + 3; j++) {
      if (j < 0 || j >= lines.length) continue;
      const p = getPrice(lines[j]);
      if (p != null) prices.push(p);
    }
    if (prices.length > 0) return Math.max(...prices);
  }
  return 0;
}

/**
 * 日付検出：2024/05/12, 2024-05-12, 2024年5月12日 → YYYY/MM/DD
 * 見つからなければ今日
 */
export function extractReceiptDate(ocrText: string): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const defaultDate = `${y}/${m}/${d}`;

  const dateMatch = ocrText.match(/\d{4}[\/\-年]\d{1,2}[\/\-月]\d{1,2}日?/);
  if (!dateMatch) return defaultDate;

  const normalized = dateMatch[0]
    .replace('年', '/')
    .replace('月', '/')
    .replace('日', '');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length !== 3) return defaultDate;
  const [yy, mm, dd] = parts;
  return `${yy}/${mm.padStart(2, '0')}/${dd.padStart(2, '0')}`;
}

/** 勘定科目を判定（vendor と text から）。既存ロジック */
export function determineAccount(vendor: string, text: string): string {
  const combined = `${vendor} ${text}`;
  if (/ヤマト|佐川|郵便|日本郵便/.test(combined)) return '荷造運賃';
  if (/JR|私鉄|地下鉄|PASMO|Suica|交通/.test(combined)) return '交通費';
  if (/Amazon|ヨドバシ|ビックカメラ/.test(combined)) return '消耗品費';
  if (/セブン|ファミマ|ローソン|セブンイレブン|ファミリーマート/.test(combined)) return '雑費';
  return '雑費';
}

/** OCRの数字の空白を詰める（金額検出などで使用）。既存互換 */
export function normalizeText(text: string): string {
  return text
    .replace(/(\d)\s+(\d)/g, (_, a, b) => a + b)
    .replace(/(\d)\s+(\d)/g, (_, a, b) => a + b);
}
