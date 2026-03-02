import type { Locator } from '@playwright/test';
import type { Page } from '@playwright/test';

export const enterCommand = async (locator: Locator, command: string) => {
  await locator.press('Enter');
  await locator.pressSequentially(command);
  await locator.press('Enter');
};

// getTerminalLocator finds locator, waits until it's attached to the DOM and returns it
export const getTerminalLocator = async (page: Page, terminalID: string): Promise<Locator> => {
  const locator = page.getByTestId(terminalID).frameLocator('iframe').locator('x-screen');
  await locator.waitFor({ state: 'attached' });
  return locator;
};

// getTerminalTabLocator finds locator, waits until it's attached to the DOM and returns it
export const getTerminalTabLocator = async (page: Page, tabID: string): Promise<Locator> => {
  const locator = page.getByTestId(tabID);
  await locator.waitFor({ state: 'attached' });
  return locator;
};
