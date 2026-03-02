import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { enterCommand, getTerminalLocator, getTerminalTabLocator } from './utils';
import { test } from './fixtures';

async function assertClearSuccessful(uart: Locator, uartTabBtn: Locator, monitor: Locator) {
  // All elements attached to the uart should be deleted - tab and terminal window.
  // After deletion monitor tab  should have 'data-active' attr.

  await Promise.all([
    expect(uart).toHaveCount(0),
    expect(uartTabBtn).toHaveCount(0),
    expect(monitor).not.toHaveCSS('display', 'none'),
  ]);
}

async function testX86UART(page: Page) {
  const machSelectBtn = page.getByTestId('Machine selection-btn');
  const uartSelectBtn = page.getByTestId('UART selection-btn');

  await expect(machSelectBtn).toBeVisible();
  await expect(uartSelectBtn).toBeVisible();

  await machSelectBtn.click();
  const selectMachOptions = machSelectBtn.locator('.items-list > button');
  await expect(selectMachOptions).toHaveCount(1);
  await expect(selectMachOptions.first(), 'First machine should be called `x86`').toContainText(
    'x86',
  );

  // close dropdown
  await machSelectBtn.click();

  // Now uarts list should be populated
  const uartSelectOptions = uartSelectBtn.locator('.items-list > button');
  await uartSelectBtn.click();
  await expect(uartSelectOptions.first(), `There should be only one UART available`).toHaveCount(1);
  await expect(
    uartSelectOptions.first(),
    'First available UART should be called `sysbus.uart`',
  ).toContainText('sysbus.uart');

  // hide dropdown
  await uartSelectBtn.click();
}

test('test open empty uarts page', async ({ page, fixtures: { loggerTabBtn } }) => {
  await loggerTabBtn.locator('.left-group').hover();
  await loggerTabBtn.locator('.group').nth(1).locator('.group-item').first().click();
  await expect(page.locator('.uart-main .empty')).toHaveText('No machines');
});

test('test UARTs panel with machine with zero uarts', async ({
  page,
  fixtures: { loggerTabBtn, monitor },
}) => {
  await enterCommand(monitor, 'mach create');

  await loggerTabBtn.locator('.left-group').hover();
  await loggerTabBtn.locator('.group').nth(1).locator('.group-item').first().click();
  await expect(page.locator('.uart-main .empty')).toHaveText('Select machine and UART');
});

test('test running script, open uart and close it on button click', async ({
  page,
  fixtures: { monitor },
}) => {
  await enterCommand(monitor, 's @scripts/single-node/x86.resc');

  // wait for uarts to appear
  const uartBtn = await getTerminalTabLocator(page, 'UARTs-btn');

  const monitorBtn = await getTerminalTabLocator(page, 'Monitor-btn');
  await monitorBtn.click();
  await expect(monitor.getByText('(x86)')).toBeVisible();

  // go back to the uart
  await uartBtn.click();

  await testX86UART(page);

  const uart = await getTerminalLocator(page, 'UARTs');
  await uartBtn.getByTestId('close-panel-btn').click();

  await assertClearSuccessful(uart, uartBtn, monitor);
});

test("test running script, open uart and close it by typing 'Clear' command", async ({
  page,
  fixtures: { monitor, monitorTabBtn },
}) => {
  await enterCommand(monitor, 's @scripts/single-node/x86.resc');

  const uartBtn = await getTerminalTabLocator(page, 'UARTs-btn');

  const monitorBtn = await getTerminalTabLocator(page, 'Monitor-btn');
  await monitorBtn.click();

  await expect(monitor.getByText('(x86)')).toBeVisible();
  await uartBtn.click();

  await testX86UART(page);
  const uart = await getTerminalLocator(page, 'UARTs');

  // Switch back to terminal and clear
  await monitorTabBtn.click();

  await enterCommand(monitor, 'Clear');
  await assertClearSuccessful(uart, uartBtn, monitor);
});
