#!/usr/bin/env node

/**
 * 檔案用途區塊
 * @module agent-verify-run-debug
 * @purpose agent-verify Phase 3 除錯輔助：探索頁面 data-testid 並輸出 debug 快照（spec 編寫前或 FAIL 後）
 * @external https://innotech.atlassian.net/browse/FE-8459
 * @external https://innotech.atlassian.net/browse/IN-140261
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { resolveTicketPaths } from './spec-utils.mjs';

/**
 * 宣告內容用途說明與單號關聯
 * @description 解析 CLI 參數 --ticket / --route / --base-url
 * @purpose 指定要診斷的 Jira 單號與本地 dev server 路由
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function parseArgs(argv) {
  const args = { ticket: '', route: '/', baseUrl: 'http://localhost:5173' };
  for (const arg of argv) {
    if (arg.startsWith('--ticket=')) args.ticket = arg.slice('--ticket='.length).toUpperCase();
    else if (arg.startsWith('--route=')) args.route = arg.slice('--route='.length);
    else if (arg.startsWith('--base-url=')) args.baseUrl = arg.slice('--base-url='.length);
  }
  if (!args.ticket) throw new Error('Missing --ticket=');
  return args;
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 於 tmp/{TICKET}/scripts/ 局部安裝 Playwright
 * @purpose 與 run-capture 共用相同 bootstrap 策略，避免根目錄依賴污染
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function ensurePlaywright(scriptsDir) {
  mkdirSync(scriptsDir, { recursive: true });
  const require = createRequire(join(scriptsDir, 'package.json'));
  const pkgPath = join(scriptsDir, 'package.json');
  if (!existsSync(pkgPath)) {
    writeFileSync(
      pkgPath,
      `${JSON.stringify({ name: 'agent-verify-scripts', private: true, type: 'module' }, null, 2)}\n`,
    );
  }
  if (!existsSync(join(scriptsDir, 'node_modules', 'playwright'))) {
    spawnSync('npm', ['install', 'playwright@^1.49.1', '--no-save'], {
      cwd: scriptsDir,
      stdio: 'inherit',
    });
    spawnSync('npx', ['playwright', 'install', 'chromium'], { cwd: scriptsDir, stdio: 'inherit' });
  }
  return require('playwright');
}

/**
 * 宣告內容用途說明與單號關聯
 * @description CLI 入口：開啟指定路由、收集 testId 清單並寫入 tmp/{TICKET}/debug/
 * @purpose 協助 Phase 2 撰寫 spec.json 的 data-testid 選擇器，或 Phase 3 FAIL 後快速診斷
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const paths = resolveTicketPaths(args.ticket);
  mkdirSync(paths.debugDir, { recursive: true });

  const playwright = ensurePlaywright(paths.scriptsDir);
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({ ...playwright.devices['Desktop Chrome'], locale: 'en-US' });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('browser error:', msg.text());
  });

  const url = args.route.startsWith('http') ? args.route : `${args.baseUrl}${args.route}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(8000);

  const debug = await page.evaluate(() => ({
    href: location.href,
    title: document.title,
    bodyText: document.body?.innerText?.slice(0, 500),
    testIds: [...document.querySelectorAll('[data-testid]')].map((el) => el.getAttribute('data-testid')),
  }));

  writeFileSync(join(paths.debugDir, 'debug.json'), `${JSON.stringify(debug, null, 2)}\n`);
  await page.screenshot({ path: join(paths.debugDir, 'debug-page.png'), fullPage: true });
  await browser.close();

  console.log(JSON.stringify({ ticket: args.ticket, debugPath: join(paths.debugDir, 'debug.json') }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

/**
 * llm 分析紀錄區
 * @llm-review-submitted-at 2026-06-27T02:50:00.000Z
 * @llm-review-model composer
 * @llm-review-note 補齊 script 標準註解區塊與 FE-8459 / IN-140261 關聯單號，未變更 runtime 邏輯。
 */
