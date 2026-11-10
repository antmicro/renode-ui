import { expect } from '@playwright/test';
import { enterCommand, getTerminalTabLocator } from './utils';
import { test } from './fixtures';

test('test SPI endpoint is stable across emulation reloads', async ({
  page,
  fixtures: { monitor },
}) => {
  for (let i = 0; i < 2; i++) {
    const socket = page.waitForEvent('websocket', (ws) => ws.url().includes('/spi/'));
    await enterCommand(monitor, 'mach create');
    await enterCommand(
      monitor,
      'machine LoadPlatformDescription @platforms/boards/stm32f7_discovery-bb.repl',
    );
    await enterCommand(monitor, 'showAnalyzer sysbus.spi1');
    const ws = await socket;
    expect(ws.url()).toMatch(/\/spi\/machine-0\/sysbus\.spi1$/);
    // Renode drops connections to endpoints it does not serve
    await page.waitForTimeout(1000);
    expect(ws.isClosed()).toBe(false);
    await enterCommand(monitor, 'Clear');
  }
});

test('test running RAMN script streams SPI exchanges', async ({ page, fixtures: { monitor } }) => {
  await enterCommand(monitor, 's @scripts/multi-node/ramn.resc');
  await enterCommand(monitor, 'start');

  await (await getTerminalTabLocator(page, 'SPI-btn')).click();
  const spi = page.locator('.data-table-wrapper', {
    has: page.getByTestId('SPI controller selection-btn'),
  });
  await expect(spi.locator('.rows .row').first()).toBeVisible({ timeout: 60_000 });
});
