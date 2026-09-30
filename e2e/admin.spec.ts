import { deflateSync } from 'zlib';
import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

function crc32(buffer: Buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function png(width: number, height: number) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  const chunk = (type: string, data: Buffer) => {
    const name = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
    return Buffer.concat([length, name, data, crc]);
  };
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function fixture(name: string, width: number, height: number) {
  const path = join(tmpdir(), name);
  writeFileSync(path, png(width, height));
  return path;
}

async function adminLogin(page: Page) {
  await page.goto('http://localhost:5174/login');
  await page.getByTestId('admin-email').fill('super@retailflow.local');
  await page.getByTestId('admin-password').fill('RetailFlow#2026');
  await page.getByTestId('admin-submit').click();
  await expect(page.getByRole('heading', { name: 'Colaboradores' })).toBeVisible();
}

test('superusuário administra a empresa e a chave não opera crédito', async ({ page, request }) => {
  await page.goto('http://localhost:5173/login');
  await page.getByTestId('login-email').fill('super@retailflow.local');
  await page.getByTestId('login-password').fill('RetailFlow#2026');
  await page.getByTestId('login-submit').click();
  await expect(page.getByText('Esta conta entra só no admin.')).toBeVisible();

  await adminLogin(page);
  await page.getByRole('button', { name: 'Empresa' }).click();
  await page.getByTestId('company-name').fill('Casa Demo');
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/v1/admin/company') && response.request().method() === 'PATCH' && response.ok()),
    page.getByTestId('save-company').click(),
  ]);
  for (const [testId, file] of [
    ['logo-square', fixture('rf-square.png', 64, 64)],
    ['logo-banner', fixture('rf-banner.png', 120, 20)],
    ['logo-story', fixture('rf-story.png', 90, 160)],
  ] as const) {
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/v1/admin/company/logos') && response.ok()),
      page.getByTestId(testId).setInputFiles(file),
    ]);
  }
  await expect(page.getByAltText('Logo quadrado')).toBeVisible();

  await page.getByRole('button', { name: 'Chaves' }).click();
  await page.getByTestId('new-key').click();
  await page.getByTestId('key-name').fill('Vitrine');
  await page.getByTestId('create-key').click();
  const token = (await page.getByTestId('partner-token').innerText()).trim();

  const products = await request.get('http://localhost:3000/api/v1/partner/products', { headers: { 'x-api-key': token } });
  expect(products.ok()).toBeTruthy();
  const credit = await request.get('http://localhost:3000/api/v1/credit/proposals', { headers: { 'x-api-key': token } });
  expect(credit.status()).toBe(401);
  const admin = await request.get('http://localhost:3000/api/v1/admin/company', { headers: { 'x-api-key': token } });
  expect(admin.status()).toBe(401);

  await page.goto('http://localhost:5173/login');
  await page.getByTestId('login-email').fill('helena.prado@retailflow.local');
  await page.getByTestId('login-password').fill('RetailFlow#2026');
  await page.getByTestId('login-submit').click();
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
  await page.getByRole('link', { name: 'Boas-vindas' }).click();
  await expect(page.getByRole('heading', { name: 'Casa Demo' })).toBeVisible();
  await expect(page.getByAltText('Logo da empresa')).toBeVisible();
});
