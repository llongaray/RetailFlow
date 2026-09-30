import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill('RetailFlow#2026');
  await page.getByTestId('login-submit').click();
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
}

test('loja de demonstração importa a venda sem duplicar', async ({ page }) => {
  await login(page, 'helena.prado@retailflow.local');
  await page.goto('/integrations');
  const connect = page.getByTestId('nuvemshop-connect');
  if (await connect.isVisible()) await connect.click();
  await expect(page.getByTestId('nuvemshop-store')).toContainText('Loja Demonstração');
  const firstSync = page.waitForResponse((response) => response.url().includes('/api/v1/integrations/nuvemshop/sync') && response.request().method() === 'POST');
  await page.getByTestId('nuvemshop-sync').click();
  expect((await firstSync).ok()).toBeTruthy();
  const secondSync = page.waitForResponse((response) => response.url().includes('/api/v1/integrations/nuvemshop/sync') && response.request().method() === 'POST');
  await page.getByTestId('nuvemshop-sync').click();
  const repeated = await (await secondSync).json();
  expect(repeated.imported).toBe(0);
  await page.goto('/sales');
  await expect(page.getByText('Nuvemshop').first()).toBeVisible();
});
