import { expect, test } from '@playwright/test';

test('listas mostram compra, telefone, estoque da rede e catálogo', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('helena.prado@retailflow.local');
  await page.getByTestId('login-password').fill('RetailFlow#2026');
  await page.getByTestId('login-submit').click();
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
  await page.goto('/customers');
  await expect(page.getByRole('columnheader', { name: 'Propostas' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Beatriz Lima' })).toBeVisible();
  await page.goto('/support');
  await expect(page.getByRole('cell', { name: '51988880001' })).toBeVisible();
  await page.goto('/catalog');
  await expect(page.getByRole('columnheader', { name: 'Rede' })).toBeVisible();
  await page.goto('/integrations');
  await expect(page.getByRole('cell', { name: 'Google Ads' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Oracle', exact: true })).toBeVisible();
});
