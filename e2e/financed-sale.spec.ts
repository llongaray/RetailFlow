import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill('RetailFlow#2026');
  await page.getByTestId('login-submit').click();
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
}

async function logout(page: import('@playwright/test').Page) {
  await page.getByTestId('session-menu').click();
  await page.getByTestId('logout').click();
}

test('venda financiada da geladeira gera contrato e baixa estoque', async ({ page }) => {
  await login(page, 'lucas.ferreira@retailflow.local');
  await page.goto('/sales/new');
  await page.getByTestId('sale-cpf').fill('52998224725');
  await page.getByRole('button', { name: 'Localizar' }).click();
  await expect(page.getByTestId('sale-customer')).toContainText('João Silva');
  await page.getByTestId('add-GEL-450').click();
  await page.getByTestId('sale-method').selectOption('FINANCED');
  await page.getByTestId('sale-installments').fill('12');
  await page.screenshot({ path: 'docs/images/ponto-de-venda.png', fullPage: true });
  await page.getByTestId('sale-review').click();
  await page.getByTestId('sale-confirm').click();
  await expect(page.getByTestId('sale-status')).toHaveText('Aguardando crédito');
  const saleUrl = page.url();

  await logout(page);
  await login(page, 'camila.nogueira@retailflow.local');
  await page.goto('/credit');
  await page.screenshot({ path: 'docs/images/fila-credito.png', fullPage: true });
  await page.getByRole('button', { name: 'Assumir' }).first().click();
  await page.getByRole('button', { name: 'Aprovar' }).first().click();

  await logout(page);
  await login(page, 'lucas.ferreira@retailflow.local');
  await page.goto(saleUrl);
  await page.getByTestId('generate-contract').click();
  await expect(page.getByTestId('sale-status')).toHaveText('Concluída');
  await expect(page.getByTestId('contract-panel')).toBeVisible();
  await page.screenshot({ path: 'docs/images/contrato.png', fullPage: true });
});
