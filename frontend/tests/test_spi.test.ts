import { expect } from '@playwright/test';
import { enterCommand, getTerminalTabLocator } from './utils';
import { test } from './fixtures';

test('test running RAMN script streams SPI exchanges', async ({ page, fixtures: { monitor } }) => {
  await enterCommand(monitor, 's @scripts/multi-node/ramn.resc');
  await enterCommand(monitor, 'start');

  await (await getTerminalTabLocator(page, 'SPI-btn')).click();
  const spi = page.locator('.data-table-wrapper', {
    has: page.getByTestId('SPI controller selection-btn'),
  });
  await expect(spi.locator('.rows .row').first()).toBeVisible({ timeout: 60_000 });
});
