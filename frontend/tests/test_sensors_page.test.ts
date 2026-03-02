import { test } from './fixtures';
import { enterCommand, getTerminalTabLocator } from './utils';
import { expect, type Locator, type Page } from '@playwright/test';

async function runSensorDemo(page: Page, monitor: Locator): Promise<void> {
  await enterCommand(monitor, 's @scripts/single-node/ck-ra6m5.resc');
  await expect(monitor.getByText('(Renesas CK-RA6M5)')).toBeVisible();

  const sensorsTabLocator = await getTerminalTabLocator(page, 'Sensors-btn');
  await expect(sensorsTabLocator).toHaveCount(1);
  await sensorsTabLocator.click();
  await page.mouse.move(0, -500); // moving mouse down so that the hover popup disappears
}

test('test sensors page - select and deselect specific sensor', async ({
  page,
  fixtures: { monitor },
}) => {
  await runSensorDemo(page, monitor);
  const sensorGroups = page.locator('.sensors > .group');
  await expect(sensorGroups).toHaveCount(6);

  const sensorsSelect = page.getByTestId('All sensors-btn');
  await sensorsSelect.locator('button').click();

  const itemsListItems = page.locator('.dropdown > .items-list > .item');
  await expect(itemsListItems, "select's dropdown should have 4 .item elements").toHaveCount(4);
  await itemsListItems.first().click();

  // Only LEDs, buttons and selected sensor should stay.
  await expect(sensorGroups).toHaveCount(3);

  // disable and recheck if sensors are back
  await sensorsSelect.locator('button').click();
  await itemsListItems.first().click();
  await expect(sensorGroups).toHaveCount(6);
});
