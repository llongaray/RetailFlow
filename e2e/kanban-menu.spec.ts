import { expect, test } from '@playwright/test';

test('menu com categorias e quadro de clientes', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('lucas.ferreira@retailflow.local');
  await page.getByTestId('login-password').fill('RetailFlow#2026');
  await page.getByTestId('login-submit').click();
  await expect(page.getByRole('heading', { name: 'Operação', level: 2 })).toBeVisible();
  await page.getByRole('link', { name: 'Boas-vindas' }).click();
  await expect(page.getByRole('heading', { name: 'Boas-vindas' })).toBeVisible();
  await page.getByRole('link', { name: 'Clientes' }).click();
  await page.getByRole('button', { name: 'Quadro' }).click();
  await expect(page.getByRole('heading', { name: /Ativo/ })).toBeVisible();
  const card = page.locator('[data-column="ATIVO"] .kanban-card').first();
  const title = await card.locator('strong').innerText();
  await card.dragTo(page.locator('[data-column="LEAD"]'));
  await expect(page.locator('[data-column="LEAD"]').getByText(title)).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-column="LEAD"]').getByText(title)).toBeVisible();
  await page.locator('[data-column="LEAD"] .kanban-card', { hasText: title }).dragTo(page.locator('[data-column="ATIVO"]'));
  await expect(page.locator('[data-column="ATIVO"]').getByText(title)).toBeVisible();
  await page.getByRole('button', { name: 'Lista' }).click();
  await expect(page.getByRole('columnheader', { name: 'Etapa' })).toBeVisible();
});
