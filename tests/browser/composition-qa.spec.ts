import { test, expect } from '@playwright/test';

test('selected blueprint table reverses once and screen fields stay isolated', async ({ page }) => {
  await page.goto('app');
  await page.getByRole('button', { name: 'New workspace', exact: true }).click();
  await page.getByLabel('Workspace name').fill('Composition sorting regression');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Create a project', exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Sort once');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await page.getByRole('button', { name: 'Blueprint', exact: true }).click();
  await expect(page.getByLabel('Screen title', { exact: true })).toHaveCount(1);
  await page.getByLabel('Screen recipe', { exact: true }).selectOption('data-table');
  const rows = page.locator('.creation-preview tbody tr td:first-child');
  const initial = await rows.allTextContents();
  expect(initial.length).toBeGreaterThan(1);
  await page.locator('.creation-preview').getByRole('button', { name: 'Name ↑', exact: true }).click();
  await expect(rows).toHaveText([...initial].reverse());
  await page.locator('.creation-preview').getByRole('button', { name: 'Name ↓', exact: true }).click();
  await expect(rows).toHaveText(initial);
  await page.getByLabel('Screen title', { exact: true }).fill('Only overview changes');
  await page.getByLabel('Preview screen', { exact: true }).selectOption('review');
  await expect(page.getByLabel('Screen title', { exact: true })).toHaveCount(1);
  await expect(page.getByLabel('Screen title', { exact: true })).toHaveValue('Review changes');
  await page.getByLabel('Preview screen', { exact: true }).selectOption('overview');
  await expect(page.getByLabel('Screen title', { exact: true })).toHaveValue('Only overview changes');
});
