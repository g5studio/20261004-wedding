#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const REQUIRED_KEYS = ['FLUID_DEV_LOGIN_ACCOUNT', 'FLUID_DEV_LOGIN_PASSWORD'];
const DEFAULT_BASE_URL = 'http://localhost:5173';
const DEFAULT_SESSION = 'fluid-dev-server';
const DEFAULT_TIMEOUT_MS = 30000;

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function printHelp() {
  console.log(`Usage:
  node .agents/skills/agent-browser-dev-server/scripts/login.mjs [options]

Options:
  --env-file <path>   Load credentials from a specific .env file. Can be used multiple times.
  --session <name>    Agent-browser session name. Default: ${DEFAULT_SESSION}
  --base-url <url>    Base URL for the local app. Default: ${DEFAULT_BASE_URL}
  --timeout-ms <ms>   Max time to wait for post-login redirect. Default: ${DEFAULT_TIMEOUT_MS}
  --skip-dismiss      Do not dismiss post-login dialogs.
  --help              Show this help message.

Env vars:
  FLUID_DEV_LOGIN_ACCOUNT
  FLUID_DEV_LOGIN_PASSWORD
  FLUID_DEV_LOGIN_BASE_URL (optional, overrides base URL)
`);
}

function parseArgs(argv) {
  const options = {
    envFiles: [],
    session: DEFAULT_SESSION,
    baseUrl: process.env.FLUID_DEV_LOGIN_BASE_URL || DEFAULT_BASE_URL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    skipDismiss: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--skip-dismiss') {
      options.skipDismiss = true;
      continue;
    }

    if (arg === '--env-file') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --env-file.');
      }
      options.envFiles.push(value);
      index += 1;
      continue;
    }

    if (arg === '--session') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --session.');
      }
      options.session = value;
      index += 1;
      continue;
    }

    if (arg === '--base-url') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --base-url.');
      }
      options.baseUrl = value;
      index += 1;
      continue;
    }

    if (arg === '--timeout-ms') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --timeout-ms.');
      }
      options.timeoutMs = Number(value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error(`Invalid --timeout-ms value: ${options.timeoutMs}`);
  }

  return options;
}

function findProjectRoot(startDirectory) {
  let currentDirectory = resolve(startDirectory);

  while (true) {
    const packageJsonPath = join(currentDirectory, 'package.json');
    if (existsSync(packageJsonPath)) {
      return currentDirectory;
    }

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

function resolveProjectRoot() {
  const cwdRoot = findProjectRoot(process.cwd());
  if (cwdRoot) {
    return cwdRoot;
  }

  const scriptRoot = findProjectRoot(SCRIPT_DIR);
  if (scriptRoot) {
    return scriptRoot;
  }

  throw new Error('Unable to find the project root from the current working directory or script path.');
}

function getEnvFilePriority(fileName) {
  const priorityMap = new Map([
    ['.env.local', 0],
    ['.env.development.local', 1],
    ['.env.development', 2],
    ['.env', 3],
  ]);

  return priorityMap.get(fileName) ?? 100;
}

function discoverEnvFiles(projectRoot) {
  return readdirSync(projectRoot)
    .filter((entry) => entry.startsWith('.env'))
    .sort((left, right) => {
      const leftPriority = getEnvFilePriority(left);
      const rightPriority = getEnvFilePriority(right);

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return left.localeCompare(right);
    })
    .map((entry) => join(projectRoot, entry));
}

function decodeQuotedValue(value) {
  const firstCharacter = value[0];
  const lastCharacter = value[value.length - 1];

  if (
    value.length >= 2 &&
    (firstCharacter === '\'' || firstCharacter === '"' || firstCharacter === '`') &&
    firstCharacter === lastCharacter
  ) {
    const innerValue = value.slice(1, -1);
    if (firstCharacter === '"') {
      return innerValue
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }

    return innerValue;
  }

  return value.replace(/\s+#.*$/, '').trim();
}

function parseEnvFile(filePath) {
  const parsed = {};
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/u);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const normalizedLine = line.startsWith('export ') ? line.slice('export '.length).trim() : line;
    const equalsIndex = normalizedLine.indexOf('=');

    if (equalsIndex === -1) {
      continue;
    }

    const key = normalizedLine.slice(0, equalsIndex).trim();
    if (!key) {
      continue;
    }

    const rawValue = normalizedLine.slice(equalsIndex + 1).trim();
    parsed[key] = decodeQuotedValue(rawValue);
  }

  return parsed;
}

function loadCredentialEnvironment(options, projectRoot) {
  const candidateFiles =
    options.envFiles.length > 0
      ? options.envFiles.map((envFile) => resolve(process.cwd(), envFile))
      : discoverEnvFiles(projectRoot);
  const environment = {};
  const sourceByKey = {};
  const searchedFiles = [];

  for (const key of REQUIRED_KEYS) {
    if (process.env[key]) {
      environment[key] = process.env[key];
      sourceByKey[key] = 'process.env';
    }
  }

  if (process.env.FLUID_DEV_LOGIN_BASE_URL) {
    sourceByKey.FLUID_DEV_LOGIN_BASE_URL = 'process.env';
  }

  for (const filePath of candidateFiles) {
    if (!existsSync(filePath)) {
      continue;
    }

    searchedFiles.push(filePath);
    const parsed = parseEnvFile(filePath);

    for (const key of REQUIRED_KEYS) {
      if (!environment[key] && parsed[key]) {
        environment[key] = parsed[key];
        sourceByKey[key] = filePath;
      }
    }

    if (!sourceByKey.FLUID_DEV_LOGIN_BASE_URL && parsed.FLUID_DEV_LOGIN_BASE_URL) {
      sourceByKey.FLUID_DEV_LOGIN_BASE_URL = filePath;
    }
  }

  const missingKeys = REQUIRED_KEYS.filter((key) => !environment[key]);
  if (missingKeys.length > 0) {
    const fileSummary = searchedFiles.length > 0 ? searchedFiles.map((filePath) => `- ${filePath}`).join('\n') : '- none';
    throw new Error(
      [
        `Missing required login credentials: ${missingKeys.join(', ')}`,
        'Checked process.env and these env files:',
        fileSummary,
        'Export the missing values or provide --env-file <path>.',
      ].join('\n'),
    );
  }

  return {
    environment,
    sourceByKey,
    searchedFiles,
  };
}

function sanitizeOutput(output) {
  return output.trim();
}

function runAgentBrowser(args, options = {}) {
  const { input, errorContext } = options;

  try {
    const stdout = execFileSync('agent-browser', args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      input,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 1024 * 1024 * 10,
    });

    return sanitizeOutput(stdout);
  } catch (error) {
    const stderr = typeof error.stderr === 'string' ? error.stderr.trim() : '';
    const stdout = typeof error.stdout === 'string' ? error.stdout.trim() : '';
    const details = [errorContext || 'agent-browser command failed.'];

    if (stderr) {
      details.push(stderr);
    } else if (stdout) {
      details.push(stdout);
    }

    throw new Error(details.join('\n'));
  }
}

function runSessionCommand(session, args, options = {}) {
  return runAgentBrowser(['--session', session, ...args], options);
}

function runEval(session, script, errorContext) {
  return runSessionCommand(session, ['eval', '--stdin'], {
    input: script,
    errorContext,
  });
}

function parseJsonOutput(output, label) {
  let parsed = output;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (typeof parsed !== 'string') {
      return parsed;
    }

    try {
      parsed = JSON.parse(parsed);
    } catch (error) {
      throw new Error(`${label} returned non-JSON output:\n${output}`);
    }
  }

  if (typeof parsed === 'string') {
    throw new Error(`${label} returned an unexpected string payload:\n${output}`);
  }

  return parsed;
}

function toLoginUrl(baseUrl) {
  return new URL('/login', baseUrl).toString();
}

async function ensureLoginUrlIsReachable(loginUrl) {
  try {
    const response = await fetch(loginUrl, {
      method: 'GET',
      redirect: 'manual',
    });

    if (response.status >= 400) {
      throw new Error(`Received HTTP ${response.status} from ${loginUrl}`);
    }
  } catch (error) {
    throw new Error(`Unable to reach ${loginUrl}. Make sure the local dev server is running.\n${error.message}`);
  }
}

function maskSource(sourcePath, projectRoot) {
  if (sourcePath === 'process.env') {
    return sourcePath;
  }

  return sourcePath.startsWith(projectRoot) ? sourcePath.slice(projectRoot.length + 1) : sourcePath;
}

function getEnsureFormScript() {
  return `
  (async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const accountField = document.querySelector('[data-testid="login-field-account"]');
      if (accountField instanceof HTMLElement) {
        return JSON.stringify({
          status: 'ready',
          attempt,
          href: window.location.href,
        });
      }

      const button = document.querySelector('button[data-testid="submit-btn"]:not([disabled])');
      if (button instanceof HTMLElement) {
        button.click();
      }

      await sleep(700);
    }

    return JSON.stringify({
      status: 'timeout',
      href: window.location.href,
      hasAccountField: Boolean(document.querySelector('[data-testid="login-field-account"]')),
      hasInitSubmitButton: Boolean(document.querySelector('button[data-testid="submit-btn"]:not([disabled])')),
    });
  })()
  `.trim();
}

function getLoginStatusScript() {
  return `
  (() => {
    const pathname = window.location.pathname;
    const isOnSportEvents = pathname.includes('/sportEvents');
    const accountFieldPresent = Boolean(document.querySelector('[data-testid="login-field-account"]'));
    const passwordFieldPresent = Boolean(document.querySelector('[data-testid="login-field-password"]'));

    return JSON.stringify({
      href: window.location.href,
      pathname,
      isOnSportEvents,
      accountFieldPresent,
      passwordFieldPresent,
      loginFormPresent: accountFieldPresent || passwordFieldPresent,
    });
  })()
  `.trim();
}

function getDismissDialogsScript() {
  return `
  (async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const results = [];

    const overlaySelector = '[data-overlay-container="true"]';
    const getText = (element) => (element.textContent || '').replace(/\\s+/gu, ' ').trim();
    const getTestId = (element) => (element.getAttribute('data-testid') || '').trim();
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const isOverlayOpen = (overlayTestId) => {
      const overlay = document.querySelector(\`[data-testid="\${overlayTestId}"]\`);
      return overlay instanceof HTMLElement && isVisible(overlay);
    };
    const getOverlayContent = (overlay) => {
      return overlay.querySelector('[data-overlay-part="content"]');
    };
    const getBackdrop = (overlay) => {
      return overlay.querySelector('[data-overlay-part="backdrop"]');
    };
    const getDismissControl = (overlay) => {
      return overlay.querySelector('[data-overlay-action="close"], [data-overlay-action="dismiss"]');
    };
    const getActionableButtons = (overlay) => {
      return Array.from(overlay.querySelectorAll('button:not([disabled])')).filter((button) => {
        return isVisible(button) && Boolean(getTestId(button) || getText(button));
      });
    };
    const getCloseIconCandidate = (overlay) => {
      const content = getOverlayContent(overlay);
      if (!(content instanceof HTMLElement)) {
        return null;
      }

      const contentRect = content.getBoundingClientRect();
      const candidates = Array.from(content.querySelectorAll('*')).filter((element) => {
        if (!(element instanceof HTMLElement) || !isVisible(element)) {
          return false;
        }

        const className = typeof element.className === 'string' ? element.className.toLowerCase() : '';
        const testId = getTestId(element).toLowerCase();
        const rect = element.getBoundingClientRect();
        const imageSources = Array.from(element.querySelectorAll('img')).map((image) =>
          (image.getAttribute('src') || '').toLowerCase(),
        );
        const hasCloseAsset = imageSources.some((src) => src.includes('close') || src.includes('cancel'));
        const isCloseLike =
          testId.includes('close') ||
          testId.includes('cancel') ||
          className.includes('cursor-pointer') ||
          hasCloseAsset;
        const isSmall = rect.width > 0 && rect.width <= 96 && rect.height > 0 && rect.height <= 96;
        const isNearTopRight = rect.top <= contentRect.top + 120 && rect.left >= contentRect.right - 120;
        return isCloseLike && isSmall && isNearTopRight;
      });

      const candidate = candidates[0];
      if (!(candidate instanceof HTMLElement)) {
        return null;
      }

      const wrapper = candidate.closest('[class*="cursor-pointer"]');
      return wrapper instanceof HTMLElement ? wrapper : candidate;
    };
    const hasMeaningfulOverlayContent = (overlay) => {
      if (!(overlay instanceof HTMLElement) || !isVisible(overlay)) {
        return false;
      }

      if (overlay.className.includes('pointer-events-none')) {
        return false;
      }

      const text = getText(overlay);
      const hasNamedButtons = getActionableButtons(overlay).length > 0;
      const hasNonOverlayTestId = Array.from(overlay.querySelectorAll('[data-testid]')).some((element) => {
        const testId = getTestId(element);
        return Boolean(testId) && !testId.startsWith('overlay-container-') && !testId.startsWith('overlay-');
      });
      return (
        text.length > 0 ||
        hasNamedButtons ||
        hasNonOverlayTestId ||
        Boolean(getDismissControl(overlay)) ||
        Boolean(getCloseIconCandidate(overlay))
      );
    };
    const getTargetOverlay = () => {
      const overlays = Array.from(document.querySelectorAll(overlaySelector)).filter((overlay) =>
        hasMeaningfulOverlayContent(overlay),
      );
      return overlays.at(-1) || null;
    };
    const tryClickAndWait = async ({ overlayTestId, element, action, metadata = {} }) => {
      if (!(element instanceof HTMLElement) || !isVisible(element)) {
        return false;
      }

      results.push({
        action,
        overlay: overlayTestId,
        ...metadata,
      });
      element.click();
      await sleep(500);
      return !isOverlayOpen(overlayTestId);
    };

    let idleRounds = 0;

    for (let step = 0; step < 12; step += 1) {
      const overlay = getTargetOverlay();
      if (!overlay) {
        if (idleRounds >= 2) {
          results.push({ action: 'done', step });
          break;
        }

        idleRounds += 1;
        results.push({ action: 'wait', step, idleRounds });
        await sleep(800);
        continue;
      }

      idleRounds = 0;

      const overlayTestId = getTestId(overlay);
      const buttons = getActionableButtons(overlay);
      const backdrop = getBackdrop(overlay);

      const findButtonByToken = (tokens) =>
        buttons.find((button) => {
          const testId = getTestId(button).toLowerCase();
          const text = getText(button).toLowerCase();
          return tokens.some((token) => testId.includes(token) || text.includes(token));
        });

      const canCloseByBackdrop =
        backdrop instanceof HTMLElement && backdrop.getAttribute('data-overlay-background-close') === 'true';

      if (
        await tryClickAndWait({
          overlayTestId,
          element: canCloseByBackdrop ? backdrop : null,
          action: 'backdrop',
          metadata: {
            step,
            backdropTestId: backdrop instanceof HTMLElement ? getTestId(backdrop) : null,
          },
        })
      ) {
        continue;
      }

      const dismissControl = getDismissControl(overlay);
      if (
        await tryClickAndWait({
          overlayTestId,
          element: dismissControl,
          action: 'dismiss-control',
          metadata: {
            step,
            dismissControlTestId: dismissControl instanceof HTMLElement ? getTestId(dismissControl) : null,
            text: dismissControl instanceof HTMLElement ? getText(dismissControl) : null,
          },
        })
      ) {
        continue;
      }

      const preferredButton =
        findButtonByToken(['close']) ||
        findButtonByToken(['cancel', 'dismiss', 'secondary', 'skip', 'later', '關閉', '关闭', '取消', '跳過', '略過']) ||
        null;

      if (
        await tryClickAndWait({
          overlayTestId,
          element: preferredButton,
          action: 'button',
          metadata: {
            step,
            buttonTestId: preferredButton instanceof HTMLElement ? getTestId(preferredButton) : null,
            text: preferredButton instanceof HTMLElement ? getText(preferredButton) : null,
          },
        })
      ) {
        continue;
      }

      const closeIconCandidate = getCloseIconCandidate(overlay);
      if (
        await tryClickAndWait({
          overlayTestId,
          element: closeIconCandidate,
          action: 'close-icon',
          metadata: {
            step,
            candidateTestId: closeIconCandidate instanceof HTMLElement ? getTestId(closeIconCandidate) : null,
            text: closeIconCandidate instanceof HTMLElement ? getText(closeIconCandidate) : null,
          },
        })
      ) {
        continue;
      }

      const fallbackButton =
        buttons.find((candidate) => candidate.hasAttribute('data-testid')) ||
        (buttons.length === 1 ? buttons[0] : null);

      if (
        await tryClickAndWait({
          overlayTestId,
          element: fallbackButton,
          action: 'fallback-button',
          metadata: {
            step,
            buttonTestId: fallbackButton instanceof HTMLElement ? getTestId(fallbackButton) : null,
            text: fallbackButton instanceof HTMLElement ? getText(fallbackButton) : null,
          },
        })
      ) {
        continue;
      }

      results.push({
        action: 'unhandled',
        step,
        overlay: overlayTestId,
        hasButtons: buttons.length > 0,
        hasBackdrop: backdrop instanceof HTMLElement,
        text: getText(overlay).slice(0, 120),
      });
      break;
    }

    return JSON.stringify(results);
  })()
  `.trim();
}

async function waitForLoginSuccess(session, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const output = runEval(session, getLoginStatusScript(), 'Failed to inspect login state.');
    const status = parseJsonOutput(output, 'Login status check');

    if (status.isOnSportEvents && !status.loginFormPresent) {
      return status;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  const finalOutput = runEval(session, getLoginStatusScript(), 'Failed to inspect login state after timeout.');
  const finalStatus = parseJsonOutput(finalOutput, 'Final login status check');
  throw new Error(
    [
      `Timed out after ${timeoutMs}ms waiting for the logged-in state.`,
      `Current URL: ${finalStatus.href}`,
      `Current path: ${finalStatus.pathname}`,
      `Login form still present: ${String(finalStatus.loginFormPresent)}`,
    ].join('\n'),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const projectRoot = resolveProjectRoot();
  const loginUrl = toLoginUrl(options.baseUrl);
  const { environment, sourceByKey } = loadCredentialEnvironment(options, projectRoot);

  console.log(`Using session: ${options.session}`);
  console.log(`Using account from: ${maskSource(sourceByKey.FLUID_DEV_LOGIN_ACCOUNT, projectRoot)}`);
  console.log(`Using password from: ${maskSource(sourceByKey.FLUID_DEV_LOGIN_PASSWORD, projectRoot)}`);
  console.log(`Opening: ${loginUrl}`);

  await ensureLoginUrlIsReachable(loginUrl);

  runSessionCommand(options.session, ['open', loginUrl], {
    errorContext: `Failed to open ${loginUrl}.`,
  });
  runSessionCommand(options.session, ['wait', '--load', 'networkidle'], {
    errorContext: 'Initial page load did not reach networkidle.',
  });

  const initialStatusOutput = runEval(options.session, getLoginStatusScript(), 'Failed to inspect initial login state.');
  const initialStatus = parseJsonOutput(initialStatusOutput, 'Initial login status check');

  if (!initialStatus.isOnSportEvents || initialStatus.loginFormPresent) {
    const ensureFormOutput = runEval(options.session, getEnsureFormScript(), 'Failed to transition into the login form.');
    const ensureFormResult = parseJsonOutput(ensureFormOutput, 'Login form transition');

    if (ensureFormResult.status !== 'ready') {
      throw new Error(
        [
          'The login form did not become available.',
          `Current URL: ${ensureFormResult.href}`,
          `Has account field: ${String(ensureFormResult.hasAccountField)}`,
          `Has init submit button: ${String(ensureFormResult.hasInitSubmitButton)}`,
        ].join('\n'),
      );
    }

    runSessionCommand(
      options.session,
      ['find', 'testid', 'login-field-account', 'fill', environment.FLUID_DEV_LOGIN_ACCOUNT],
      {
        errorContext: 'Failed to fill the account field.',
      },
    );
    runSessionCommand(
      options.session,
      ['find', 'testid', 'login-field-password', 'fill', environment.FLUID_DEV_LOGIN_PASSWORD],
      {
        errorContext: 'Failed to fill the password field.',
      },
    );
    runSessionCommand(options.session, ['find', 'testid', 'submit-btn', 'click'], {
      errorContext: 'Failed to submit the login form.',
    });
  }

  const finalStatus = await waitForLoginSuccess(options.session, options.timeoutMs);

  if (!options.skipDismiss) {
    const dismissOutput = runEval(options.session, getDismissDialogsScript(), 'Failed while dismissing post-login dialogs.');
    const dismissResults = parseJsonOutput(dismissOutput, 'Dialog dismissal');
    const dismissedCount = dismissResults.filter((item) =>
      ['backdrop', 'dismiss-control', 'button', 'close-icon', 'fallback-button'].includes(item.action),
    ).length;
    console.log(`Dismissed dialogs: ${dismissedCount}`);
  }

  console.log(`Login succeeded: ${finalStatus.href}`);
}

await main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
