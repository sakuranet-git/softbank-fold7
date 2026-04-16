/**
 * SoftBank Galaxy Z Fold7 在庫監視 (GitHub Actions用)
 * 他社MNP + 自宅受け取り の在庫チェック → ntfy.sh でスマホ通知
 */

const { chromium } = require('playwright-chromium');
const https = require('https');

const NTFY_TOPIC = process.env.NTFY_TOPIC || 'softbank-fold7';
const URL = 'https://online-shop.mb.softbank.jp/sbols/ContractTypePage/?agncyId=sbm&itemType=23&receiptStyleCtrl=1&modelGrpCd=SCSBF1';

function log(msg) {
  const ts = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  console.log(`[${ts}] ${msg}`);
}

function ntfyNotify(title, message) {
  return new Promise((resolve) => {
    const body = Buffer.from(message, 'utf8');
    const req = https.request({
      hostname: 'ntfy.sh',
      path: '/' + NTFY_TOPIC,
      method: 'POST',
      headers: {
        'X-Title': encodeURIComponent(title),
        'X-Priority': '5',
        'X-Tags': 'rotating_light,shopping',
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': body.length
      }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { log('ntfy通知送信完了 status:' + res.statusCode); resolve(); });
    });
    req.on('error', e => { log('ntfy通知エラー: ' + e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

async function checkStock() {
  let browser;
  try {
    browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    await page.click('text=自宅などで受け取る').catch(() => {});
    await page.waitForTimeout(300);
    await page.click('text=他社からのりかえ（MNP）').catch(() => {});
    await page.waitForTimeout(300);
    await page.click('text=19～59歳').catch(() => {});
    await page.waitForTimeout(300);
    await page.click('text=はい').catch(() => {});
    await page.waitForTimeout(300);
    await page.click('text=おススメ非表示で次へ').catch(() => {});
    await page.waitForTimeout(4000);

    const bodyText = await page.innerText('body').catch(() => '');

    const colors = ['ブルーシャドウ', 'シルバーシャドウ', 'ジェットブラック'];
    const stockStatus = {};
    let hasStock = false;

    for (const color of colors) {
      const idx = bodyText.indexOf(color);
      if (idx !== -1) {
        const nearby = bodyText.substring(idx, idx + 50);
        const inStock = !nearby.includes('在庫なし');
        stockStatus[color] = inStock ? '在庫あり' : '在庫なし';
        if (inStock) hasStock = true;
      }
    }

    const noStockAll = bodyText.includes('現在すべてのカラーで在庫がございません');
    if (noStockAll) hasStock = false;

    const statusStr = Object.entries(stockStatus)
      .map(([c, s]) => `${c}: ${s}`)
      .join('\n') || bodyText.substring(0, 200);

    log(`チェック完了 → ${hasStock ? '⚡在庫あり！' : '全色在庫なし'}`);
    log(statusStr.replace(/\n/g, ' / '));

    if (hasStock) {
      log('🎉 在庫入荷を検出！ntfy通知を送信します');
      await ntfyNotify(
        'Galaxy Z Fold7 在庫入荷！',
        `MNP・自宅受け取り\n\n${statusStr}\n\n今すぐ購入:\nhttps://online-shop.mb.softbank.jp/sbols/ContractTypePage/?agncyId=sbm&itemType=23&receiptStyleCtrl=1&modelGrpCd=SCSBF1`
      );
      process.exit(0);
    }

  } catch (err) {
    log('エラー: ' + err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

checkStock();
