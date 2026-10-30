import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { enterCommand, getTerminalTabLocator } from './utils';
import { test } from './fixtures';

async function openDisplaysPanel(tabButton: Locator) {
  await tabButton.getByTestId('panel-dropdown-btn').click();
  await tabButton.getByTestId('Displays-option').click();
}

test('test open empty displays page', async ({ page, fixtures: { loggerTabBtn } }) => {
  await openDisplaysPanel(loggerTabBtn);
  await expect(page.locator('.display-main .empty')).toHaveText('No displays');
});

test('test opening a display does not block opening a UART', async ({
  page,
  fixtures: { monitor },
}) => {
  await enterCommand(monitor, 'mach create');
  await enterCommand(
    monitor,
    'machine LoadPlatformDescription @platforms/boards/stm32f7_discovery-bb.repl',
  );
  await enterCommand(monitor, 'showAnalyzer sysbus.ltdc');
  await getTerminalTabLocator(page, 'Displays-btn');

  await enterCommand(monitor, 'showAnalyzer sysbus.usart1');
  await expect(page.getByTestId('UARTs-btn')).toBeVisible();
});

test('test running script, open display and stream frames', async ({
  page,
  fixtures: { monitor },
}) => {
  await enterCommand(monitor, 's @scripts/single-node/stm32f746.resc');

  const displayBtn = await getTerminalTabLocator(page, 'Displays-btn');
  await displayBtn.click();

  const display = page.locator('.display-main');
  await expect(display.getByTestId('Machine selection-btn')).toContainText('STM32F746');
  await expect(display.getByTestId('Display selection-btn')).toContainText('sysbus.ltdc');

  await expect(display.locator('.info')).toContainText('480×272', { timeout: 30_000 });
  await expect(display.locator('canvas')).toHaveAttribute('width', '480');
  await expect
    .poll(
      () =>
        display.locator('canvas').evaluate((canvas: HTMLCanvasElement) =>
          canvas
            .getContext('2d')!
            .getImageData(0, 0, canvas.width, canvas.height)
            // The demo outputs RGBX, so every 4th byte is padding and is skipped
            .data.some((value, i) => i % 4 !== 3 && value !== 0),
        ),
      { message: 'Decoded frames should draw something on the canvas', timeout: 30_000 },
    )
    .toBe(true);
});

test("test running script, open display and close it by typing 'Clear' command", async ({
  page,
  fixtures: { monitor, monitorTabBtn },
}) => {
  await enterCommand(monitor, 's @scripts/single-node/stm32f746.resc');

  const displayBtn = await getTerminalTabLocator(page, 'Displays-btn');

  await monitorTabBtn.click();
  await enterCommand(monitor, 'Clear');

  await expect(displayBtn).toHaveCount(0);
  await expect(page.locator('.display-main')).toHaveCount(0);
});

test('test display endpoint is stable across emulation reloads', async ({
  page,
  fixtures: { monitor },
}) => {
  for (let i = 0; i < 2; i++) {
    const socket = page.waitForEvent('websocket', (ws) => ws.url().includes('/display/'));
    await enterCommand(monitor, 's @scripts/single-node/stm32f746.resc');
    expect((await socket).url()).toMatch(/\/display\/STM32F746\/sysbus\.ltdc$/);
    await enterCommand(monitor, 'Clear');
  }
});
