import { expect, test } from '@playwright/test';

test('o admin da loja ativa o website e edita no modal', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('helena.prado@retailflow.local');
  await page.getByTestId('login-password').fill('RetailFlow#2026');
  await page.getByTestId('login-submit').click();
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();

  await page.getByRole('link', { name: 'Addons' }).click();
  await expect(page.getByRole('heading', { name: 'Addons' })).toBeVisible();
  await expect(page.getByText('ACTIVE')).toBeVisible();

  await page.getByRole('link', { name: 'Website' }).click();
  await expect(page.getByRole('heading', { name: 'Website' })).toBeVisible();
  await page.getByRole('button', { name: 'Editar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar website' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Nome').fill('RetailFlow');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Rascunho guardado.')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Editar' }).click();
  await expect(page.getByRole('dialog', { name: 'Editar website' })).toBeVisible();
  const box = await page.getByRole('dialog', { name: 'Editar website' }).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
});
