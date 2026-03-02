import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';

const dispatchEndDndEvents = async (page: Page, clientX: number, clientY: number) => {
  const monitorIframeSelector = '[data-test-id="Monitor"]';
  await page.dispatchEvent(monitorIframeSelector, 'dragover', { clientX, clientY });
  await page.dispatchEvent(monitorIframeSelector, 'drop', { clientX, clientY });
  await page.dispatchEvent(monitorIframeSelector, 'dragend');
};

test('test dockview dnd', async ({
  page,
  browserName,
  fixtures: { loggerTabBtn, monitorTabBtn },
}) => {
  await loggerTabBtn.hover();

  const { x: px, y: py } = (await loggerTabBtn.boundingBox())!;
  const { width: vx, height: vy } = page.viewportSize()!;

  // NOTE: Drag events have to be dispatched manually in firefox:
  // Playwright bug, not fixed even though they say they did.
  // https://github.com/microsoft/playwright/issues/17441
  const isFirefox = browserName === 'firefox';

  if (isFirefox) {
    await page.dispatchEvent('[data-test-id="Renode Logs-btn"]', 'dragstart', {
      dataTransfer: await page.evaluateHandle(() => new DataTransfer()),
    });
  } else {
    await page.mouse.down();
  }

  const clientX = vx - px - 5;
  const clientY = vy - py - 5;
  await page.mouse.move(clientX, clientY, { steps: 5 });

  if (isFirefox) {
    await dispatchEndDndEvents(page, clientX, clientY);
  } else {
    await page.mouse.up();
  }

  // Make sure that both panels are visible - when they are grouped - one of
  // them doesn't have display property set.
  const terminalPanels = await page.locator('.dv-render-overlay').all();
  for (const panel of terminalPanels) {
    await expect(panel).not.toHaveCSS('display', 'none');
  }

  const activeSelector = '.dv-groupview.dv-active-group';
  const inactiveSelector = '.dv-groupview.dv-inactive-group';

  // Check focused tab indicator (lighter tab colour)
  // Logger panel should be focused
  await Promise.all([
    expect(page.locator(activeSelector)).toContainText('Renode Logs', { useInnerText: true }),
    expect(page.locator(inactiveSelector)).toContainText('Monitor', { useInnerText: true }),
  ]);

  // Now focus should switch to monitor
  await monitorTabBtn.click();
  await Promise.all([
    expect(page.locator(activeSelector)).toContainText('Monitor', { useInnerText: true }),
    expect(page.locator(inactiveSelector)).toContainText('Renode Logs', { useInnerText: true }),
  ]);

  // Now focus should switch back to logger
  await loggerTabBtn.click();
  await Promise.all([
    expect(page.locator(activeSelector)).toContainText('Renode Logs', { useInnerText: true }),
    expect(page.locator(inactiveSelector)).toContainText('Monitor', { useInnerText: true }),
  ]);
});
