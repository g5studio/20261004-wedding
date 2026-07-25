#!/usr/bin/env node

/**
 * Agent-verify Playwright capture runner.
 * Executes spec.json actions and writes snapshots under tmp/{TICKET}/.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import {
  loadSpec,
  saveSpec,
  resolveTicketPaths,
} from './spec-utils.mjs';

function getBlockingLayerConfig(spec) {
  const layers = spec.environment?.blockingLayers || {};
  return {
    popupSelectors: Array.isArray(layers.popupSelectors) ? layers.popupSelectors : [],
    closeSelectors: Array.isArray(layers.closeSelectors) ? layers.closeSelectors : [],
  };
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 解析 CLI 參數 --spec / --ticket / --write-script
 * @purpose 支援直接指定 spec 路徑或依 ticket 推導 tmp/{TICKET}/test-plan/spec.json
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function parseArgs(argv) {
  const args = { spec: '', ticket: '', writeScript: false, port: '', baseUrl: '' };
  for (const arg of argv) {
    if (arg.startsWith('--spec=')) args.spec = arg.slice('--spec='.length);
    else if (arg.startsWith('--ticket=')) args.ticket = arg.slice('--ticket='.length).toUpperCase();
    else if (arg.startsWith('--port=')) args.port = arg.slice('--port='.length).trim();
    else if (arg.startsWith('--base-url=')) args.baseUrl = arg.slice('--base-url='.length).trim();
    else if (arg === '--write-script') args.writeScript = true;
  }
  if (!args.spec && args.ticket) {
    args.spec = resolveTicketPaths(args.ticket).specPath;
  }
  if (!args.spec) throw new Error('Missing --spec= or --ticket=');
  return args;
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 依 Jira 單號推導驗證專用 port，避免多單並行時共用固定 port 互衝。
 * @purpose 為 agent-verify 的本地驗證流程提供可預期且可重現的預設 port。
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function getVerificationPortByTicket(ticket) {
  const digits = Number(String(ticket || '').replace(/\D/g, ''));
  if (!Number.isFinite(digits) || digits <= 0) {
    return '5173';
  }
  return String(5600 + (digits % 1000));
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 依參數與環境優先序解析本次驗證使用的 baseUrl。
 * @purpose 支援以單號推導預設 port，同時保留 CLI / spec / env 覆蓋能力。
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function resolveBaseUrl(args, spec) {
  if (args.baseUrl) {
    return args.baseUrl.replace(/\/$/, '');
  }

  const env = spec.environment || {};
  if (env.baseUrl) {
    return String(env.baseUrl).replace(/\/$/, '');
  }

  const envBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL;
  if (envBaseUrl) {
    return String(envBaseUrl).replace(/\/$/, '');
  }

  const portFromArgOrEnv = args.port || process.env.PLAYWRIGHT_PORT || process.env.PW_PORT || process.env.VITE_PORT;
  if (portFromArgOrEnv) {
    return `http://localhost:${portFromArgOrEnv}`;
  }

  return `http://localhost:${getVerificationPortByTicket(spec.ticket)}`;
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 於 tmp/{TICKET}/scripts/ 局部安裝 Playwright 並回傳 require 實例
 * @purpose 避免污染專案根 package.json，首次執行時自動 bootstrap chromium
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
  const pwPath = join(scriptsDir, 'node_modules', 'playwright');
  if (!existsSync(pwPath)) {
    console.log('Installing playwright in', scriptsDir);
    const install = spawnSync('npm', ['install', 'playwright@^1.49.1', '--no-save'], {
      cwd: scriptsDir,
      stdio: 'inherit',
    });
    if (install.status !== 0) throw new Error('Failed to install playwright');
    spawnSync('npx', ['playwright', 'install', 'chromium'], { cwd: scriptsDir, stdio: 'inherit' });
  }
  return require('playwright');
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 檢查當前頁面是否有可見公告彈窗。
 * @purpose 讓驗證腳本可在需要時只針對公告類遮擋做清理。
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function hasVisibleBlockingLayer(page, config) {
  for (const selector of config.popupSelectors) {
    const candidate = page.locator(selector).first();
    if (await candidate.isVisible().catch(() => false)) {
      return true;
    }
  }
  return false;
}

async function dismissBlockingLayersIfNeeded(page, config, action = {}) {
  if (!(await hasVisibleBlockingLayer(page, config))) {
    return;
  }

  const maxRound = Number(action.maxRound || 3);
  for (let round = 0; round < maxRound; round += 1) {
    let hasClicked = false;
    for (const selector of config.closeSelectors) {
      const candidate = page.locator(selector).first();
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click({ force: true }).catch(() => {});
        await page.waitForTimeout(200);
        hasClicked = true;
      }
    }
    if (!(await hasVisibleBlockingLayer(page, config))) {
      return;
    }
    if (!hasClicked) {
      break;
    }
  }

  if (action.assertClosed !== false) {
    await assertNoBlockingLayer(page, config);
  }
}

async function assertNoBlockingLayer(page, config) {
  if (await hasVisibleBlockingLayer(page, config)) {
    throw new Error('Blocking layer still visible after dismiss attempt');
  }
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 解析 action 內的 `testId` 或 `testIds` 設定為 selector 陣列。
 * @purpose 支援 spec 在不同關閉策略下使用單一或多個 testid 目標。
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function resolveTestIdSelectors(action) {
  const testIdList = [];
  if (action.testId) {
    testIdList.push(action.testId);
  }
  if (Array.isArray(action.testIds)) {
    testIdList.push(...action.testIds);
  }

  return testIdList.filter(Boolean).map((testId) => `[data-testid="${testId}"]`);
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 依照 action 指定的 testid 主動嘗試關閉彈窗。
 * @purpose 讓 test script 可自行決定關閉哪個流程/公告彈窗與何時關閉。
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function dismissPopupByTestIds(page, action) {
  const selectors = resolveTestIdSelectors(action);
  if (selectors.length === 0) {
    throw new Error('dismissPopupByTestId action requires testId or testIds');
  }

  let clickedCount = 0;
  for (const selector of selectors) {
    const candidate = page.locator(selector).first();
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click({ force: true }).catch(() => {});
      await page.waitForTimeout(Number(action.waitMs || 200));
      clickedCount += 1;
    }
  }

  if (clickedCount === 0 && action.allowMissing !== true) {
    throw new Error(`dismissPopupByTestId could not find visible target: ${selectors.join(', ')}`);
  }

  console.log(`[popup-dismiss] clicked ${clickedCount} target(s)`);
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 執行 spec item 單一 action（goto / click / wait / waitMs / screenshot）
 * @purpose 對應 spec.template.json actions[] 的機讀步驟定義
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function runAction(page, action, env, snapshotDir, blockingLayerConfig) {
  const baseUrl = env.baseUrl || 'http://localhost:5173';
  switch (action.type) {
    case 'goto': {
      const url = action.url.startsWith('http') ? action.url : `${baseUrl}${action.url}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: action.timeout || 120000 });
      break;
    }
    case 'click':
      await page.locator(`[data-testid="${action.testId}"]`).click({ timeout: action.timeout || 60000 });
      break;
    case 'wait':
      await page.waitForSelector(`[data-testid="${action.testId}"]`, {
        timeout: action.timeout || 60000,
      });
      break;
    case 'waitMs':
      await page.waitForTimeout(action.ms || 2000);
      break;
    case 'screenshot': {
      const filename = action.file || action.filename;
      if (!filename) throw new Error('screenshot action requires file');
      await page.screenshot({
        path: join(snapshotDir, filename),
        fullPage: false,
      });
      break;
    }
    case 'dismissAnnouncementPopup':
      await dismissBlockingLayersIfNeeded(page, blockingLayerConfig, action);
      break;
    case 'assertNoAnnouncementPopup':
      await assertNoBlockingLayer(page, blockingLayerConfig);
      break;
    case 'dismissPopupByTestId':
      await dismissPopupByTestIds(page, action);
      break;
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 依序執行單一 spec item 的全部 actions
 * @purpose Phase 3 逐測項驗收的最小執行單元
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function runItem(page, item, env, snapshotDir, blockingLayerConfig) {
  const actions = item.actions || [];
  if (actions.length === 0) {
    throw new Error(`Item ${item.id} has no actions`);
  }
  for (const action of actions) {
    await runAction(page, action, env, snapshotDir, blockingLayerConfig);
  }
}

/**
 * 宣告內容用途說明與單號關聯
 * @description CLI 入口：載入 spec、啟動 Playwright、逐 item 驗收並回寫 result
 * @purpose agent-verify Phase 3 主路徑批次截圖；FAIL 時寫入 debug/{id}-debug.json
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const spec = loadSpec(args.spec);
  const paths = resolveTicketPaths(spec.ticket);
  mkdirSync(paths.snapshotDir, { recursive: true });
  mkdirSync(paths.debugDir, { recursive: true });

  const playwright = ensurePlaywright(paths.scriptsDir);
  const env = spec.environment || {};
  const resolvedBaseUrl = resolveBaseUrl(args, spec);
  const runtimeEnv = { ...env, baseUrl: resolvedBaseUrl };
  console.log(`Using baseUrl: ${resolvedBaseUrl}`);
  const deviceName = env.viewport || 'Desktop Chrome';
  const devices = playwright.devices;
  const device = devices[deviceName] || devices['Desktop Chrome'];

  const browser = await playwright.chromium.launch({ headless: env.headless !== false });
  const context = await browser.newContext({
    ...device,
    locale: env.locale || 'en-US',
  });
  const page = await context.newPage();

  const blockingLayerConfig = getBlockingLayerConfig(spec);
  const results = [];
  let hasFailure = false;

  for (const item of spec.items) {
    try {
      console.log(`Running ${item.id} (${item.tab || item.title || item.slug || ''})`);
      await runItem(page, item, runtimeEnv, paths.snapshotDir, blockingLayerConfig);
      item.result = item.result || 'PASS';
      item.screenshot = item.screenshot || `${item.id}.png`;
      results.push({ id: item.id, result: 'PASS' });
      console.log(`  ✅ ${item.id}`);
    } catch (error) {
      hasFailure = true;
      item.result = 'FAIL';
      item.notes = error.message;
      results.push({ id: item.id, result: 'FAIL', error: error.message });
      console.error(`  ❌ ${item.id}: ${error.message}`);

      const debug = await page.evaluate(() => ({
        href: location.href,
        title: document.title,
        bodyText: document.body?.innerText?.slice(0, 500),
        testIds: [...document.querySelectorAll('[data-testid]')]
          .slice(0, 60)
          .map((el) => el.getAttribute('data-testid')),
      }));
      writeFileSync(join(paths.debugDir, `${item.id}-debug.json`), `${JSON.stringify(debug, null, 2)}\n`);
      try {
        await page.screenshot({
          path: join(paths.debugDir, `${item.id}-debug.png`),
          fullPage: false,
        });
      } catch {
        // ignore screenshot errors during debug
      }
    }
  }

  await browser.close();
  spec.executedAt = new Date().toISOString();
  saveSpec(args.spec, spec);

  console.log(JSON.stringify({ ticket: spec.ticket, results, hasFailure }, null, 2));
  if (hasFailure) process.exit(1);
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
