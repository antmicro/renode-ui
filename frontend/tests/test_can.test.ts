import { expect } from '@playwright/test';
import { enterCommand, getTerminalTabLocator } from './utils';
import { test } from './fixtures';

test('test CAN endpoint is stable across emulation reloads', async ({
  page,
  fixtures: { monitor },
}) => {
  for (let i = 0; i < 2; i++) {
    const socket = page.waitForEvent('websocket', (ws) => ws.url().includes('/can/'));
    await enterCommand(monitor, 'emulation CreateCANHub "canHub"');
    await enterCommand(monitor, 'showAnalyzer canHub');
    const ws = await socket;
    expect(ws.url()).toMatch(/\/can\/canHub$/);
    // Renode drops connections to endpoints it does not serve
    await page.waitForTimeout(1000);
    expect(ws.isClosed()).toBe(false);
    await enterCommand(monitor, 'Clear');
  }
});

test('test running RAMN script streams CAN frames', async ({ page, fixtures: { monitor } }) => {
  await enterCommand(monitor, 's @scripts/multi-node/ramn.resc');
  await enterCommand(monitor, 'start');

  await (await getTerminalTabLocator(page, 'CAN-btn')).click();
  const can = page.locator('.data-table-wrapper', {
    has: page.getByTestId('CAN hub selection-btn'),
  });
  await expect(can.locator('.rows .row').first()).toBeVisible({ timeout: 60_000 });
});
