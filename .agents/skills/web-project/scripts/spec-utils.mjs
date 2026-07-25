/**
 * 檔案用途區塊
 * @module agent-verify-spec-utils
 * @purpose agent-verify spec 路徑解析、動態驗收表（由 test plan / spec.report 驅動）
 * @external https://innotech.atlassian.net/browse/FE-8459
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const DEFAULT_COLUMN_HEADERS = {
  id: 'ID',
  tab: 'Tab',
  title: '標題',
  verifyPoints: '驗證項目',
  i18nKeys: 'i18n Key',
  expectedDarkColor: '預期 dark 色',
  result: '結果',
  screenshot: '截圖',
  notes: '備註',
};

export function resolveTicketPaths(ticket, projectRoot = process.cwd()) {
  const normalized = ticket.toUpperCase();
  const root = join(projectRoot, 'tmp', normalized);
  return {
    ticket: normalized,
    root,
    testPlanDir: join(root, 'test-plan'),
    specPath: join(root, 'test-plan', 'spec.json'),
    planPath: join(root, 'test-plan', 'plan.md'),
    snapshotDir: join(root, 'snapshot'),
    debugDir: join(root, 'debug'),
    scriptsDir: join(root, 'scripts'),
    reportPath: join(root, 'verification-report.md'),
  };
}

export function loadSpec(specPath) {
  if (!existsSync(specPath)) {
    throw new Error(`spec.json not found: ${specPath}`);
  }
  const raw = readFileSync(specPath, 'utf-8');
  const spec = JSON.parse(raw);
  if (!Array.isArray(spec.items) || spec.items.length === 0) {
    throw new Error('spec.json must contain a non-empty items array');
  }
  return spec;
}

export function saveSpec(specPath, spec) {
  mkdirSync(dirname(specPath), { recursive: true });
  writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf-8');
}

export function formatResultEmoji(result) {
  const value = String(result || '').toUpperCase();
  if (value === 'PASS') return '✅';
  if (value === 'WARN') return '⚠️';
  if (value === 'FAIL') return '❌';
  return '—';
}

export function formatI18nKeys(keys) {
  if (!hasI18nContent(keys)) return '—';
  if (Array.isArray(keys)) {
    return keys.map((k) => `\`${k}\``).join(' / ');
  }
  return `\`${keys}\``;
}

export function formatI18nKeysPlain(keys) {
  if (!hasI18nContent(keys)) return '—';
  if (Array.isArray(keys)) {
    return keys.join(' / ');
  }
  return String(keys);
}

function hasI18nContent(keys) {
  if (!keys) return false;
  if (Array.isArray(keys)) return keys.length > 0;
  return String(keys).trim().length > 0;
}

export function resolveItemTabLabel(item) {
  const slugVendor = item.slug?.match(/^(vd\d+)/)?.[1];
  if (slugVendor) {
    return slugVendor;
  }
  return item.tab || item.slug || item.id;
}

export function formatResultCell(item) {
  const notes = String(item.notes || '').trim();
  const emoji = formatResultEmoji(item.result);
  if (notes) {
    return `${emoji} ${notes}`.trim();
  }
  return emoji;
}

/**
 * 由 spec.report.columns 定義表格欄位；未指定時依 items 內容自動推斷（非固定五欄範本）
 */
export function resolveReportColumns(spec) {
  if (spec.report?.columns?.length) {
    return spec.report.columns.map((col) => {
      if (typeof col === 'string') {
        return {
          key: col,
          header: DEFAULT_COLUMN_HEADERS[col] || col,
          type: col === 'screenshot' ? 'screenshot' : 'text',
        };
      }
      return {
        key: col.key,
        header: col.header || DEFAULT_COLUMN_HEADERS[col.key] || col.key,
        type: col.type || (col.key === 'screenshot' ? 'screenshot' : 'text'),
      };
    });
  }

  const keys = ['tab', 'verifyPoints'];
  if (spec.items.some((item) => hasI18nContent(item.i18nKeys))) {
    keys.push('i18nKeys');
  }
  if (spec.items.some((item) => String(item.expectedDarkColor || '').trim())) {
    keys.push('expectedDarkColor');
  }
  keys.push('result');
  if (spec.items.some((item) => item.screenshot)) {
    keys.push('screenshot');
  }

  return keys.map((key) => ({
    key,
    header: DEFAULT_COLUMN_HEADERS[key] || key,
    type: key === 'screenshot' ? 'screenshot' : 'text',
  }));
}

export function resolveCellText(spec, item, columnKey) {
  switch (columnKey) {
    case 'id':
      return item.id || '—';
    case 'tab':
      return resolveItemTabLabel(item);
    case 'title':
      return item.title || '—';
    case 'verifyPoints':
      return item.verifyPoints || item.title || '—';
    case 'i18nKeys':
      return formatI18nKeysPlain(item.i18nKeys);
    case 'expectedDarkColor':
      return item.expectedDarkColor || '—';
    case 'result':
      return formatResultCell(item);
    case 'notes':
      return item.notes || '—';
    case 'screenshot':
      return item.screenshot || `${item.id}.png`;
    default:
      return item[columnKey] != null && String(item[columnKey]).trim() !== ''
        ? String(item[columnKey])
        : '—';
  }
}

export function buildVerificationEnvLine(spec) {
  const env = spec.environment || {};
  return [
    env.label,
    env.baseUrl && `baseUrl=${env.baseUrl}`,
    env.route && `route=${env.route}`,
    env.profile && `profile=${env.profile}`,
    env.vendor && `vendor=${env.vendor}`,
    env.layout && `layout=${env.layout}`,
    env.envName && String(env.envName).toUpperCase(),
    env.viewport && `${env.viewport} viewport`,
    env.locale && `locale=${env.locale}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function buildReportHeading(spec) {
  if (spec.report?.heading) {
    return spec.report.heading;
  }
  const envLabel = spec.environment?.label ? `（${spec.environment.label}）` : '';
  return `${spec.ticket} 本地 QA 驗證${envLabel}`;
}

function resolveScreenshotMarkdownCell(item, uploadById, forJira) {
  const tab = resolveItemTabLabel(item);
  let screenshotCell = item.screenshot || `${item.id}.png`;
  if (!forJira) {
    const upload = uploadById[item.id];
    if (upload?.markdown) {
      screenshotCell = upload.markdown.replace(/\!\[.*?\]/, `![${tab}]`);
    } else if (upload?.url) {
      screenshotCell = `<a href="${upload.url}" target="_blank"><img src="${upload.url}" alt="${tab}" width="240"/></a>`;
    }
  }
  return screenshotCell;
}

/**
 * 依 test plan 定義的 columns 產生 Markdown 驗收表（MR / report.md）
 */
export function buildVerificationTableMarkdown(spec, uploadById = {}, options = {}) {
  const forJira = Boolean(options.forJira);
  const columns = resolveReportColumns(spec);
  const envLine = buildVerificationEnvLine(spec);

  const header = `## ${buildReportHeading(spec)}\n\n**環境**：${envLine || '（見 spec.environment）'}\n`;
  const headerRow = `| ${columns.map((col) => col.header).join(' | ')} |`;
  const sepRow = `|${columns.map(() => '---').join('|')}|`;

  const rows = spec.items.map((item) => {
    const cells = columns.map((col) => {
      if (col.type === 'screenshot' || col.key === 'screenshot') {
        return resolveScreenshotMarkdownCell(item, uploadById, forJira);
      }
      return resolveCellText(spec, item, col.key);
    });
    return `| ${cells.join(' | ')} |`;
  });

  const table = [headerRow, sepRow, ...rows].join('\n');
  const notes = (spec.notes || []).map((note) => `- ${note}`).join('\n');

  return `${header}\n${table}${notes ? `\n\n**備註**\n${notes}` : ''}`;
}

/** @deprecated 別名，保留相容 */
export function build7285VerificationTable(spec, uploadById = {}, options = {}) {
  return buildVerificationTableMarkdown(spec, uploadById, options);
}

export function buildVerificationReportMarkdown(spec, uploadById = {}) {
  const table = buildVerificationTableMarkdown(spec, uploadById);
  const allPass = spec.items.every((item) => String(item.result || '').toUpperCase() === 'PASS');
  return `${table}\n\n**整體結果**：${allPass ? 'PASS' : 'FAIL'}\n`;
}

export function buildVerificationReportMarkdownForJira(spec) {
  const table = buildVerificationTableMarkdown(spec, {}, { forJira: true });
  const allPass = spec.items.every((item) => String(item.result || '').toUpperCase() === 'PASS');
  return `${table}\n\n**整體結果**：${allPass ? 'PASS' : 'FAIL'}\n`;
}

/**
 * llm 分析紀錄區
 * @llm-review-submitted-at 2026-06-27T06:30:00.000Z
 * @llm-review-model composer
 * @llm-review-note 新增 resolveReportColumns / buildVerificationTableMarkdown 動態欄位 API；保留 build7285VerificationTable 別名向下相容。
 */
