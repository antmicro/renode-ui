import {
  test as base,
  type BrowserContext,
  expect,
  type Locator,
  type Page,
} from '@playwright/test';
import { getTerminalLocator, getTerminalTabLocator } from './utils';
import path from 'path';
import { ChildProcess, spawn } from 'child_process';
import { createWriteStream, WriteStream } from 'fs';

export type PrepareEnvItems = {
  monitor: Locator;
  logger: Locator;
  monitorTabBtn: Locator;
  loggerTabBtn: Locator;
};

export const test = base.extend<{ fixtures: PrepareEnvItems }>({
  fixtures: [
    async ({ context, page }, use, testInfo) => {
      const { logStream, websocketProcess } = await spawnRenodeWebsocketProxy(testInfo.title);
      const items = await prepareEnv(page);
      await use(items);
      await cleanup(context, page, websocketProcess, logStream);
    },
    { auto: true },
  ],
});

const spawnRenodeWebsocketProxy = async (testName: string) => {
  const flags = ['--server-mode'];
  const renodeBinaryPath = path.resolve('../renode-portable/renode');
  const workspacePath = path.resolve('../renode-portable');
  const logStream = createWriteStream(`test-results/wsproxy-${testName}.log`);

  flags.push(`--server-mode-work-dir=${workspacePath}`);

  const websocketProcess = spawn(renodeBinaryPath, [...flags], { stdio: 'pipe', detached: true });

  websocketProcess.on('error', (msg) => {
    console.log(`RenodeWebsocketProxy has returned an error: ${msg}`);
  });

  let passedData = '';

  await new Promise<void>((resolve) => {
    websocketProcess.stdout?.on('data', (chunk: Buffer) => {
      passedData += new TextDecoder().decode(chunk);
      logStream.write(chunk);

      if (passedData.includes('Loaded monitor commands')) {
        resolve();
      }
    });
  });

  return { websocketProcess, logStream };
};

const prepareEnv = async (page: Page): Promise<PrepareEnvItems> => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const logger = await getTerminalLocator(page, 'Renode Logs');
  const monitor = await getTerminalLocator(page, 'Monitor');

  const loggerTabBtn = await getTerminalTabLocator(page, 'Renode Logs-btn');
  const monitorTabBtn = await getTerminalTabLocator(page, 'Monitor-btn');

  await expect(monitor.locator('x-row').nth(2)).toContainText('(monitor)', { timeout: 5_000 });

  return {
    monitor,
    logger,
    monitorTabBtn,
    loggerTabBtn,
  };
};

const cleanup = async (
  context: BrowserContext,
  page: Page,
  proc: ChildProcess,
  logStream: WriteStream,
) => {
  logStream.destroy();
  await page.close();
  await context.close();
  await new Promise((resolve) => {
    proc.once('exit', resolve);
    // To kill child process with descendants
    process.kill(-proc.pid!, 'SIGTERM');
  });
};
