#!/usr/bin/env node

/**
 * 檔案用途區塊
 * @module agent-verify-publish-results
 * @purpose agent-verify Phase 4：上傳 snapshot、發布 GitLab MR 獨立 note 留言、發布 Jira ADF inline 圖片留言、追加 agent-verify Jira label（表格欄位由 spec.report.columns 驅動）
 * @external https://innotech.atlassian.net/browse/FE-8459
 * @external https://innotech.atlassian.net/browse/IN-140752
 * @external https://gitlab.service-hub.tech/frontend/fluid-two/-/merge_requests/7285#note_500460
 */

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { basename, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import {
  loadSpec,
  build7285VerificationTable,
  buildVerificationReportMarkdown,
  buildVerificationEnvLine,
  buildReportHeading,
  resolveReportColumns,
  resolveCellText,
  resolveItemTabLabel,
} from './spec-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../../..');

/**
 * agent-verify 發布後追加至 Jira 單的追蹤 label
 * @description 供日後篩選已執行代理驗收的 ticket
 * @external https://innotech.atlassian.net/browse/IN-140752
 */
const AGENT_VERIFY_JIRA_LABEL = 'agent-verify';

/**
 * 宣告內容用途說明與單號關聯
 * @description 依 Pantheon 掛載路徑解析 utilities 腳本（.pantheon 優先）
 * @purpose 確保 Jira/GitLab 憑證與 agent-signature 在掛載專案可正確載入
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function resolvePantheonScript(relativePath) {
  const candidates = [
    join(projectRoot, '.pantheon/.cursor/scripts', relativePath),
    join(projectRoot, '.cursor/scripts', relativePath),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error(
    `Cannot find Pantheon script: ${relativePath}. Run pantheon:descend or pantheon:oracle.`,
  );
}

const { getJiraConfig, getGitLabToken, getProjectRoot } = await import(
  `file://${resolvePantheonScript('utilities/env-loader.mjs')}`
);
const { appendAgentSignature } = await import(
  `file://${resolvePantheonScript('utilities/agent-signature.mjs')}`
);

/**
 * 宣告內容用途說明與單號關聯
 * @description 解析 CLI 參數（ticket、mr、spec、snapshot-dir、update-mr、post-jira 等）
 * @purpose Phase 4 發布腳本統一參數入口
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function parseArgs(argv) {
  const args = {
    ticket: '',
    mr: '',
    plan: '',
    report: '',
    spec: '',
    snapshotDir: '',
    updateMr: false,
    postJira: false,
    jiraCommentId: '',
    dryRun: false,
  };
  for (const arg of argv) {
    if (arg.startsWith('--ticket=')) args.ticket = arg.slice('--ticket='.length).toUpperCase();
    else if (arg.startsWith('--mr=')) args.mr = arg.slice('--mr='.length);
    else if (arg.startsWith('--plan=')) args.plan = arg.slice('--plan='.length);
    else if (arg.startsWith('--report=')) args.report = arg.slice('--report='.length);
    else if (arg.startsWith('--spec=')) args.spec = arg.slice('--spec='.length);
    else if (arg.startsWith('--snapshot-dir=')) args.snapshotDir = arg.slice('--snapshot-dir='.length);
    else if (arg.startsWith('--jira-comment-id=')) {
      args.jiraCommentId = arg.slice('--jira-comment-id='.length);
    }
    else if (arg === '--update-mr=true') args.updateMr = true;
    else if (arg === '--post-jira=true') args.postJira = true;
    else if (arg === '--dry-run') args.dryRun = true;
  }
  if (!args.ticket) throw new Error('Missing --ticket=IN-XXXXX');
  if (!args.mr) throw new Error('Missing --mr=<iid>');
  if (!args.snapshotDir) throw new Error('Missing --snapshot-dir=');
  return args;
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 從 plan.md 表格解析測項代號（T0、T1…）順序
 * @purpose 無 spec.json 時 fallback 決定 snapshot 上傳順序
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function parseTestIdsFromPlan(planPath) {
  if (!planPath || !existsSync(planPath)) return [];
  const content = readFileSync(planPath, 'utf-8');
  const ids = [];
  const seen = new Set();
  for (const match of content.matchAll(/\|\s*(T\d+)\s*\|/g)) {
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids.sort((a, b) => {
    const na = Number(a.slice(1));
    const nb = Number(b.slice(1));
    return na - nb;
  });
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 依 testIds 或目錄掃描列出 snapshot 檔案路徑
 * @purpose 對齊 spec item id 與 tmp/{TICKET}/snapshot/T{n}.png
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function listSnapshotFiles(snapshotDir, testIds) {
  if (testIds.length > 0) {
    return testIds.map((id) => ({
      id,
      path: join(snapshotDir, `${id}.png`),
    }));
  }
  const files = readdirSync(snapshotDir)
    .filter((f) => /^T\d+\.png$/i.test(f))
    .sort((a, b) => {
      const na = Number(a.match(/T(\d+)/i)[1]);
      const nb = Number(b.match(/T(\d+)/i)[1]);
      return na - nb;
    });
  return files.map((f) => ({
    id: f.replace(/\.png$/i, '').toUpperCase(),
    path: join(snapshotDir, f),
  }));
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 從 git remote 解析 GitLab host 與 project path
 * @purpose GitLab API uploads / MR update 所需專案識別
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function getProjectInfo(root) {
  const remoteUrl = execSync('git config --get remote.origin.url', {
    cwd: root,
    encoding: 'utf-8',
  }).trim();
  const match = remoteUrl.match(/git@([^:]+):(.+)/) || remoteUrl.match(/https?:\/\/([^/]+)\/(.+)/);
  if (!match) throw new Error(`Cannot parse remote: ${remoteUrl}`);
  const [, host, path] = match;
  const cleanPath = path.replace(/\.git$/, '');
  return {
    host: host.startsWith('http') ? host : `https://${host}`,
    projectPath: encodeURIComponent(cleanPath),
    fullPath: cleanPath,
  };
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 組裝 Jira REST API Basic Auth header
 * @purpose 上傳 attachment 與發布 comment 共用
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function jiraAuthHeader() {
  const { email, apiToken } = getJiraConfig();
  return `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 回傳不含尾斜線的 Jira base URL
 * @purpose 統一 REST endpoint 拼接
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function jiraBaseUrl() {
  const { baseUrl } = getJiraConfig();
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 上傳 PNG 至 Jira issue attachments
 * @purpose Phase 4 取得 attachmentId 供 ADF inline media 使用
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function uploadJiraAttachment(ticket, filePath) {
  const form = new FormData();
  const buffer = readFileSync(filePath);
  form.append('file', new Blob([buffer]), basename(filePath));

  const response = await fetch(`${jiraBaseUrl()}/rest/api/3/issue/${ticket}/attachments`, {
    method: 'POST',
    headers: {
      Authorization: jiraAuthHeader(),
      'X-Atlassian-Token': 'no-check',
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(
      `Jira upload failed (${basename(filePath)}): ${response.status} ${await response.text()}`,
    );
  }
  const data = await response.json();
  return { attachmentId: data[0]?.id, filename: data[0]?.filename };
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 上傳 PNG 至 GitLab project uploads API
 * @purpose MR description 內嵌截圖 markdown / HTML
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function uploadGitLab(token, projectInfo, filePath) {
  const form = new FormData();
  const buffer = readFileSync(filePath);
  form.append('file', new Blob([buffer]), basename(filePath));

  const response = await fetch(`${projectInfo.host}/api/v4/projects/${projectInfo.projectPath}/uploads`, {
    method: 'POST',
    headers: { 'PRIVATE-TOKEN': token },
    body: form,
  });

  if (!response.ok) {
    throw new Error(
      `GitLab upload failed (${basename(filePath)}): ${response.status} ${await response.text()}`,
    );
  }
  const data = await response.json();
  return {
    markdown: data.markdown,
    url: data.url,
    fullPath: `${projectInfo.host}/${projectInfo.fullPath}${data.url}`,
  };
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 建立 Jira ADF paragraph 節點
 * @purpose buildJiraAdfDoc 組裝留言結構
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function adfParagraph(text) {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  };
}

function adfEnvParagraph(envLine) {
  return {
    type: 'paragraph',
    content: [
      { type: 'text', text: '環境：', marks: [{ type: 'strong' }] },
      { type: 'text', text: envLine },
    ],
  };
}

function adfMrLinkParagraph(mrUrl) {
  if (!mrUrl) {
    return null;
  }
  return {
    type: 'paragraph',
    content: [
      { type: 'text', text: 'MR：' },
      { type: 'text', text: mrUrl, marks: [{ type: 'link', attrs: { href: mrUrl } }] },
    ],
  };
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 建立 Jira ADF heading 節點
 * @purpose buildJiraAdfDoc 組裝留言結構
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function adfHeading(level, text) {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  };
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 建立 Jira ADF mediaSingle 節點（inline 圖片預覽）
 * @purpose Phase 4 Jira 留言須內嵌截圖而非僅 attachment
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
/**
 * @description IN-140261 範例使用 attachment thumbnail + external media，非 file UUID
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function adfAttachmentThumbnailMedia(attachmentId, alt) {
  return {
    type: 'mediaSingle',
    attrs: { layout: 'center' },
    content: [
      {
        type: 'media',
        attrs: {
          type: 'external',
          url: `${jiraBaseUrl()}/rest/api/3/attachment/thumbnail/${attachmentId}`,
          alt: alt || '',
        },
      },
    ],
  };
}

function adfTableCell(contentNodes) {
  return {
    type: 'tableCell',
    attrs: {},
    content: contentNodes,
  };
}

function adfTableHeaderCell(text) {
  return {
    type: 'tableHeader',
    attrs: {},
    content: [adfParagraph(text)],
  };
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 依 spec.report.columns（test plan）產生 Jira ADF 驗收表
 * @purpose Phase 4 Jira 留言表格由 test plan 動態驅動，非固定五欄範本
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
function buildVerificationAdfTable(spec, snapshotsWithMedia) {
  const columns = resolveReportColumns(spec);
  const mediaById = Object.fromEntries(snapshotsWithMedia.map((item) => [item.id, item]));
  const headerRow = {
    type: 'tableRow',
    content: columns.map((col) => adfTableHeaderCell(col.header)),
  };

  const bodyRows = spec.items.map((item) => {
    const tabLabel = resolveItemTabLabel(item);
    const cells = columns.map((col) => {
      if (col.type === 'screenshot' || col.key === 'screenshot') {
        const media = mediaById[item.id];
        if (media?.attachmentId) {
          return adfTableCell([adfAttachmentThumbnailMedia(media.attachmentId, tabLabel)]);
        }
        return adfTableCell([adfParagraph(resolveCellText(spec, item, 'screenshot'))]);
      }
      return adfTableCell([adfParagraph(resolveCellText(spec, item, col.key))]);
    });
    return { type: 'tableRow', content: cells };
  });

  return {
    type: 'table',
    content: [headerRow, ...bodyRows],
  };
}

function build7285JiraNotesNodes(spec) {
  if (!spec.notes?.length) {
    return [];
  }

  return [
    adfHeading(3, '備註'),
    {
      type: 'bulletList',
      content: spec.notes.map((note) => ({
        type: 'listItem',
        content: [adfParagraph(note)],
      })),
    },
  ];
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 組裝 Jira ADF（對齊 IN-140261 #833269：標題 + 環境 + MR + 完整測試表 + 備註）
 * @external https://innotech.atlassian.net/browse/IN-140261
 */
async function buildJiraAdfDoc(reportMarkdown, snapshotsWithMedia, spec, mrUrl) {
  let content = [];

  if (spec?.items?.length) {
    content = [
      adfHeading(2, buildReportHeading(spec)),
      adfEnvParagraph(buildVerificationEnvLine(spec) || '（見 spec.environment）'),
      buildVerificationAdfTable(spec, snapshotsWithMedia),
      ...build7285JiraNotesNodes(spec),
    ];

    const mrParagraph = adfMrLinkParagraph(mrUrl);
    if (mrParagraph) {
      content.splice(2, 0, mrParagraph);
    }
  } else {
    content = [adfParagraph(reportMarkdown.trim().slice(0, 4000))];
    if (snapshotsWithMedia.length > 0) {
      content.push(adfHeading(3, '驗收截圖'));
      for (const item of snapshotsWithMedia) {
        content.push(adfParagraph(`${item.id} — ${item.caption || item.filename}`));
        if (item.attachmentId) {
          content.push(adfAttachmentThumbnailMedia(item.attachmentId, item.filename));
        }
      }
    }
  }

  const signatureText = appendAgentSignature('');
  if (signatureText) {
    content.push(adfParagraph(signatureText));
  }

  return { type: 'doc', version: 1, content };
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 以 ADF body POST Jira issue comment
 * @purpose Phase 4 發布代理驗收結果至 Jira
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function postJiraComment(ticket, adfDoc) {
  const response = await fetch(`${jiraBaseUrl()}/rest/api/3/issue/${ticket}/comment`, {
    method: 'POST',
    headers: {
      Authorization: jiraAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: adfDoc }),
  });

  if (!response.ok) {
    throw new Error(`Jira comment failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 以 ADF body PUT 更新既有 Jira comment
 * @purpose 避免重複留言，修正格式時原地更新
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function updateJiraComment(ticket, commentId, adfDoc) {
  const response = await fetch(`${jiraBaseUrl()}/rest/api/3/issue/${ticket}/comment/${commentId}`, {
    method: 'PUT',
    headers: {
      Authorization: jiraAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: adfDoc }),
  });

  if (!response.ok) {
    throw new Error(`Jira comment update failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 讀取 Jira issue 現有 labels
 * @purpose Phase 4 追加 agent-verify label 前取得現況
 * @external https://innotech.atlassian.net/browse/IN-140752
 */
async function fetchJiraIssueLabels(ticket) {
  const response = await fetch(`${jiraBaseUrl()}/rest/api/3/issue/${ticket}?fields=labels`, {
    headers: {
      Authorization: jiraAuthHeader(),
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Jira fetch labels failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.fields?.labels || [];
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 冪等追加 Jira label（保留既有 labels）
 * @purpose agent-verify 發布 Jira 驗收結果後自動標記，便於追蹤測試品質
 * @external https://innotech.atlassian.net/browse/IN-140752
 */
async function ensureJiraLabel(ticket, label) {
  const existingLabels = await fetchJiraIssueLabels(ticket);
  const normalizedExisting = existingLabels.map((item) => item.toLowerCase());

  if (normalizedExisting.includes(label.toLowerCase())) {
    return { label, added: false, labels: existingLabels };
  }

  const mergedLabels = [...existingLabels, label];
  const response = await fetch(`${jiraBaseUrl()}/rest/api/3/issue/${ticket}`, {
    method: 'PUT',
    headers: {
      Authorization: jiraAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: { labels: mergedLabels } }),
  });

  if (!response.ok) {
    throw new Error(`Jira label update failed: ${response.status} ${await response.text()}`);
  }

  return { label, added: true, labels: mergedLabels };
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 列出 GitLab MR notes（依更新時間降序）
 * @purpose 冪等 upsert 時查找既有 agent-verify 留言
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function listMrNotes(token, projectInfo, mrIid, perPage = 100) {
  const url = `${projectInfo.host}/api/v4/projects/${projectInfo.projectPath}/merge_requests/${mrIid}/notes?per_page=${perPage}&sort=desc&order_by=updated_at`;
  const response = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } });
  if (!response.ok) {
    throw new Error(`List MR notes failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 建立 GitLab MR 獨立 note 留言
 * @purpose Phase 4 發布代理驗收報告至 MR discussion timeline
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function postMrNote(token, projectInfo, mrIid, body) {
  const url = `${projectInfo.host}/api/v4/projects/${projectInfo.projectPath}/merge_requests/${mrIid}/notes`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'PRIVATE-TOKEN': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  });
  if (!response.ok) {
    throw new Error(`Post MR note failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 更新既有 GitLab MR note 留言
 * @purpose 重跑 Phase 4 時原地更新同一份驗收報告
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function updateMrNote(token, projectInfo, mrIid, noteId, body) {
  const url = `${projectInfo.host}/api/v4/projects/${projectInfo.projectPath}/merge_requests/${mrIid}/notes/${noteId}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'PRIVATE-TOKEN': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  });
  if (!response.ok) {
    throw new Error(`Update MR note failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 依 marker 查找並 upsert MR 驗收 note（不修改 MR description）
 * @purpose 對齊 MR !7285 note 格式，支援重跑覆寫
 * @external https://innotech.atlassian.net/browse/FE-8459
 * @external https://gitlab.service-hub.tech/frontend/fluid-two/-/merge_requests/7285#note_500460
 */
async function upsertMrVerificationNote(token, projectInfo, mrIid, ticket, noteBody) {
  const markerStart = `<!-- agent-verify:${ticket}:start -->`;
  const notes = await listMrNotes(token, projectInfo, mrIid);
  const existing = notes.find(
    (note) => typeof note.body === 'string' && note.body.includes(markerStart),
  );

  if (existing?.id) {
    const note = await updateMrNote(token, projectInfo, mrIid, existing.id, noteBody);
    return { note, updated: true };
  }
  const note = await postMrNote(token, projectInfo, mrIid, noteBody);
  return { note, updated: false };
}

/**
 * 宣告內容用途說明與單號關聯
 * @description 組裝 MR note 驗證區塊（HTML marker + 7285 表或 fallback markdown）
 * @purpose 以 <!-- agent-verify:{TICKET}:start/end --> 支援冪等 upsert
 * @external https://innotech.atlassian.net/browse/FE-8459
 * @external https://gitlab.service-hub.tech/frontend/fluid-two/-/merge_requests/7285#note_500460
 */
function buildMrVerificationSection(ticket, reportMarkdown, gitlabUploads, spec) {
  const markerStart = `<!-- agent-verify:${ticket}:start -->`;
  const markerEnd = `<!-- agent-verify:${ticket}:end -->`;

  const uploadById = Object.fromEntries(gitlabUploads.map((u) => [u.id, u]));
  const body = spec
    ? build7285VerificationTable(spec, uploadById)
    : `${reportMarkdown.trim()}\n\n## 驗收截圖\n\n${gitlabUploads.map((u) => `### ${u.id}\n\n${u.markdown}`).join('\n\n')}`;

  const section = `${markerStart}\n${body}\n${markerEnd}`;

  return { markerStart, markerEnd, section };
}

/**
 * 宣告內容用途說明與單號關聯
 * @description CLI 入口：上傳 snapshot、發布 MR note、發布 Jira comment
 * @purpose agent-verify Phase 4 完整發布流程
 * @external https://innotech.atlassian.net/browse/FE-8459
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = getProjectRoot() || projectRoot;
  const spec = args.spec && existsSync(args.spec) ? loadSpec(args.spec) : null;
  const testIds = spec
    ? spec.items.map((item) => item.id)
    : parseTestIdsFromPlan(args.plan);
  const snapshots = listSnapshotFiles(args.snapshotDir, testIds).filter((s) => {
    if (!existsSync(s.path)) {
      console.warn(`Warning: missing snapshot ${s.path}`);
      return false;
    }
    return true;
  });

  if (snapshots.length === 0) {
    throw new Error(`No snapshots found in ${args.snapshotDir}`);
  }

  let reportMarkdown =
    args.report && existsSync(args.report)
      ? readFileSync(args.report, 'utf-8')
      : spec
        ? buildVerificationReportMarkdown(spec, {})
        : `# 代理驗收報告 — ${args.ticket}\n\n自動發布（無 report 檔）`;

  if (args.dryRun) {
    console.log(JSON.stringify({ args, snapshots: snapshots.map((s) => s.id) }, null, 2));
    return;
  }

  const needsGitLab = args.updateMr;
  const token = needsGitLab ? getGitLabToken() : '';
  if (needsGitLab && !token) {
    throw new Error('Missing GITLAB_TOKEN');
  }
  const projectInfo = needsGitLab ? getProjectInfo(root) : null;

  const gitlabUploads = [];
  const jiraMediaItems = [];

  for (const snap of snapshots) {
    if (needsGitLab) {
      const gitlab = await uploadGitLab(token, projectInfo, snap.path);
      gitlabUploads.push({
        id: snap.id,
        tab: spec?.items?.find((i) => i.id === snap.id)?.tab,
        ...gitlab,
        filename: basename(snap.path),
      });
    }

    const { attachmentId, filename } = await uploadJiraAttachment(args.ticket, snap.path);
    jiraMediaItems.push({
      id: snap.id,
      attachmentId,
      filename,
      caption: filename,
    });
  }

  let mrUrl = null;
  if (args.mr) {
    const info = projectInfo || getProjectInfo(root);
    mrUrl = `${info.host}/${info.fullPath}/-/merge_requests/${args.mr}`;
  }

  if (spec) {
    const uploadById = Object.fromEntries(gitlabUploads.map((u) => [u.id, u]));
    reportMarkdown = buildVerificationReportMarkdown(spec, uploadById);
    if (args.report) {
      writeFileSync(args.report, `${reportMarkdown}\n`, 'utf-8');
    }
  }

  let mrNoteResult = null;
  if (args.updateMr) {
    const { section } = buildMrVerificationSection(
      args.ticket,
      reportMarkdown,
      gitlabUploads,
      spec,
    );
    const noteBody = appendAgentSignature(section.trim());
    mrNoteResult = await upsertMrVerificationNote(
      token,
      projectInfo,
      args.mr,
      args.ticket,
      noteBody,
    );
  }

  let jiraComment = null;
  let jiraLabelResult = null;
  if (args.postJira) {
    const adfDoc = await buildJiraAdfDoc(reportMarkdown, jiraMediaItems, spec, mrUrl);
    if (args.jiraCommentId) {
      jiraComment = await updateJiraComment(args.ticket, args.jiraCommentId, adfDoc);
    } else {
      jiraComment = await postJiraComment(args.ticket, adfDoc);
    }
    jiraLabelResult = await ensureJiraLabel(args.ticket, AGENT_VERIFY_JIRA_LABEL);
  }

  const resolvedCommentId = args.jiraCommentId || jiraComment?.id || null;
  const mrNote = mrNoteResult?.note || null;
  const mrNoteId = mrNote?.id || null;
  const result = {
    ticket: args.ticket,
    mrIid: args.mr,
    mrUrl,
    mrNoteId,
    mrNoteUrl: mrNoteId && mrUrl ? `${mrUrl}#note_${mrNoteId}` : null,
    mrNoteUpdated: Boolean(mrNoteResult?.updated),
    jiraUrl: `${jiraBaseUrl()}/browse/${args.ticket}`,
    jiraCommentId: resolvedCommentId,
    jiraCommentUrl: resolvedCommentId
      ? `${jiraBaseUrl()}/browse/${args.ticket}?focusedCommentId=${resolvedCommentId}`
      : null,
    jiraCommentUpdated: Boolean(args.jiraCommentId),
    jiraLabel: jiraLabelResult?.label || null,
    jiraLabelAdded: Boolean(jiraLabelResult?.added),
    jiraLabels: jiraLabelResult?.labels || null,
    snapshots: snapshots.map((s) => s.id),
    gitlabUploads: gitlabUploads.map((u) => ({ id: u.id, url: u.fullPath })),
    jiraMedia: jiraMediaItems.map((j) => ({ id: j.id, attachmentId: j.attachmentId })),
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

/**
 * llm 分析紀錄區
 * @llm-review-submitted-at 2026-06-27T06:30:00.000Z
 * @llm-review-model composer
 * @llm-review-note Phase 4 MR 改為 POST/PUT notes API 獨立留言；post-jira 成功後冪等追加 agent-verify Jira label（IN-140752）。
 */
