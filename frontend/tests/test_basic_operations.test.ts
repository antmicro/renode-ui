import { expect } from '@playwright/test';
import { enterCommand, getTerminalLocator, getTerminalTabLocator } from './utils';
import { test } from './fixtures';

test('test input and output in monitor via telnet connection', async ({
  fixtures: { monitor },
}) => {
  await enterCommand(monitor, 'nonexisting');
  await expect(monitor.getByText('No such command or device: nonexisting')).toBeVisible();
});

test('test logging window receive logs', async ({
  fixtures: { monitor, logger, loggerTabBtn },
}) => {
  await enterCommand(monitor, 'log "frontend test" 1');
  // move to the logger window
  await loggerTabBtn.click();
  await expect(logger.getByText('[INFO] Script: frontend test')).toBeVisible();
});

test('test running script, opening uart windows and interacting with them', async ({
  page,
  fixtures: { monitor },
}) => {
  await enterCommand(monitor, 's @scripts/single-node/x86.resc');

  // wait for uarts to appear
  const uartBtn = await getTerminalTabLocator(page, 'UARTs-btn');

  const monitorBtn = await getTerminalTabLocator(page, 'Monitor-btn');
  await monitorBtn.click({ position: { x: 1, y: 1 } });
  await expect(monitor.getByText('(x86)')).toBeVisible();

  // go back to the uarts
  await uartBtn.click();

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

  // close dropdown
  await uartSelectBtn.click();

  const uart = await getTerminalLocator(page, 'UARTs');
  await expect(uart.getByText('U-Boot 2012.04 (May 08 2012 - 23:40:03)')).toBeVisible();
  await uart.pressSequentially('version');
  await expect(uart.getByText('boot > version')).toBeVisible();
});

test('test toggle maximize panes on button click', async ({
  fixtures: { monitor, logger, monitorTabBtn, loggerTabBtn },
}) => {
  // initially both panes should be visible
  await expect(monitor).toBeVisible();
  await expect(logger).toBeVisible();

  // focus monitor tab
  await monitorTabBtn.click();
  // toggle maximize pane
  await monitorTabBtn.getByTestId('maximize-panel-btn').click();

  // monitor should be maximized, logger should be hidden
  await expect(monitor).toBeVisible();
  await expect(logger).toBeHidden();

  // restore minimize pane
  await monitorTabBtn.getByTestId('maximize-panel-btn').click();

  // after restore both panes should be visible again
  await expect(monitor).toBeVisible();
  await expect(logger).toBeVisible();

  // focus logger tab
  await loggerTabBtn.click();
  // toggle maximize pane
  await loggerTabBtn.getByTestId('maximize-panel-btn').click();

  // logger should be maximized, monitor should be hidden
  await expect(logger).toBeVisible();
  await expect(monitor).toBeHidden();

  // restore minimize pane
  await loggerTabBtn.getByTestId('maximize-panel-btn').click();

  // after restore both panes should be visible again
  await expect(monitor).toBeVisible();
  await expect(logger).toBeVisible();
});
