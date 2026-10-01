import { expect, test } from '@playwright/test';

const site = 'http://localhost:5175';

test('a landing anônima mostra o hero publicado e some quando o addon está inativo', async ({ page, request }) => {
  await page.goto(site + '/');
  await expect(page.getByTestId('site-hero')).toContainText('Vendas e crédito');

  const login = await request.post('http://localhost:3000/api/v1/auth/login', {
    data: { email: 'helena.prado@retailflow.local', password: 'RetailFlow#2026' },
  });
  expect(login.ok()).toBeTruthy();
  const token = ((await login.json()) as { accessToken: string }).accessToken;
  const headers = { authorization: 'Bearer ' + token };

  const off = await request.post('http://localhost:3000/api/v1/addons/website/deactivate', { headers });
  expect(off.ok()).toBeTruthy();
  await page.goto(site + '/');
  await expect(page.getByTestId('site-hero')).toHaveCount(0);

  const on = await request.post('http://localhost:3000/api/v1/addons/website/activate', { headers });
  expect(on.ok()).toBeTruthy();
});
