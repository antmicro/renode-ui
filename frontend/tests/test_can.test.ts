import { expect } from '@playwright/test';
import { enterCommand, getTerminalTabLocator } from './utils';
import { test } from './fixtures';

test('test running RAMN script streams CAN frames', async ({ page, fixtures: { monitor } }) => {
  await enterCommand(monitor, 's @scripts/multi-node/ramn.resc');
  await enterCommand(monitor, 'start');

  await (await getTerminalTabLocator(page, 'CAN-btn')).click();
  const can = page.locator('.data-table-wrapper', {
    has: page.getByTestId('CAN hub selection-btn'),
  });
  await expect(can.locator('.rows .row').first()).toBeVisible({ timeout: 60_000 });
});
