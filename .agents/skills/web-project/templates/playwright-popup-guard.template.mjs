/**
 * Playwright popup guard template for agent-verify.
 * Copy and customize selectors, routes, and milestones for your project.
 */

import { chromium } from 'playwright';

/** Configure project-specific blocking layer selectors. */
const blockingLayerConfig = {
  popupSelectors: [],
  closeSelectors: [],
};

/**
 * 宣告內容用途說明與單號關聯
 * @description 解析 CLI 參數與環境變數，回傳可覆蓋的 baseUrl。
 * @purpose 避免範本寫死 localhost:5175，降低多線程驗證時的埠號互卡風險。
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function getBaseUrl() {
  const baseUrlArg = process.argv.find((arg) => arg.startsWith('--base-url='))?.split('=').slice(1).join('=').trim();
  if (baseUrlArg) {
    return baseUrlArg.replace(/\/$/, '');
  }
  const portArg = process.argv.find((arg) => arg.startsWith('--port='))?.split('=').slice(1).join('=').trim();
  const envPort = process.env.PLAYWRIGHT_PORT ?? process.env.PW_PORT ?? process.env.VITE_PORT;
  const resolvedPort = portArg || envPort || '5175';
  const envBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL;
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, '');
  }
  return `http://localhost:${resolvedPort}`;
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 檢查頁面是否有可見公告彈窗。
 * @purpose 讓驗證流程僅在公告遮擋出現時才啟動關閉流程。
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

async function dismissBlockingLayersIfNeeded(page, config, options = {}) {
  if (!(await hasVisibleBlockingLayer(page, config))) {
    return;
  }

  const maxRound = Number(options.maxRound || 3);
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

  if (options.assertClosed !== false) {
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
 * @description 解析 action 設定中的 `testId` 或 `testIds` 為 selector 清單。
 * @purpose 支援測試腳本依需求指定要關閉的流程型彈窗目標。
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function resolveTestIdSelectors(targets) {
  return targets.filter(Boolean).map((testId) => `[data-testid="${testId}"]`);
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 以 data-testid 主動關閉指定彈窗（可用於流程型彈窗）。
 * @purpose 讓 test script 自行決定是否關閉與關閉哪一種彈窗，而非強制全域關閉。
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function dismissPopupByTestIds(page, targets, options = {}) {
  const selectors = resolveTestIdSelectors(targets);
  if (selectors.length === 0) {
    throw new Error('dismissPopupByTestIds requires at least one test id');
  }

  let clickedCount = 0;
  for (const selector of selectors) {
    const candidate = page.locator(selector).first();
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click({ force: true }).catch(() => {});
      await page.waitForTimeout(Number(options.waitMs || 200));
      clickedCount += 1;
    }
  }

  if (clickedCount === 0 && options.allowMissing !== true) {
    throw new Error(`dismissPopupByTestIds could not find visible target: ${selectors.join(', ')}`);
  }

  return clickedCount;
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 驗證 execution layer 里程碑是否都達成。
 * @purpose 明確阻擋僅靠 Playwright action 成功就判定 PASS 的錯誤。
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function assertMilestones(milestones) {
  const required = ['entered_target_page', 'opened_target_panel', 'visible_core_element'];
  const missing = required.filter((key) => !milestones[key]);
  if (missing.length > 0) {
    throw new Error(`Milestones missing: ${missing.join(', ')}`);
  }
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 示範如何在測試腳本中按需呼叫不同彈窗關閉方法。
 * @purpose 提供「是否關閉、關閉哪種彈窗」由測試腳本自行決定的實作範例。
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function main() {
  const baseUrl = getBaseUrl();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const milestones = {
    entered_target_page: false,
    opened_target_panel: false,
    visible_core_element: false,
  };

  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  milestones.entered_target_page = true;

  await dismissBlockingLayersIfNeeded(page, blockingLayerConfig);

  await dismissPopupByTestIds(page, ['terms-accept-btn'], { allowMissing: true });

  await page.locator('[data-testid="main-nav-item"]').click({ force: true });
  milestones.opened_target_panel = true;

  await page.waitForSelector('[data-testid="target-panel"]', { timeout: 30000 });
  milestones.visible_core_element = true;

  await page.screenshot({ path: 'T0.png', fullPage: false });

  assertMilestones(milestones);
  console.log('Execution layer passed. Next step: semantic screenshot review by agent.');

  await browser.close();
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 統一捕捉範本執行錯誤並回傳非 0 code。
 * @purpose 讓上層流程可正確判斷腳本失敗，避免假 PASS。
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
