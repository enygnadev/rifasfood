import { test, expect } from '@playwright/test';

test('cart flow: add item via localStorage, open cart, see total, clear', async ({ page }) => {
  await page.goto('/');
  // ensure cart empty
  await page.evaluate(() => localStorage.removeItem('rf_cart'));
  await page.reload();

  // open cart -> should show empty
  await page.getByRole('button', { name: /abrir carrinho/i }).click();
  const empty = await page.getByText('Carrinho vazio');
  await expect(empty).toBeVisible();

  // set cart items in localStorage
  await page.evaluate(() => {
    localStorage.setItem('rf_cart', JSON.stringify([{ rifaId: 'galinha', nome: 'Galinha', quantidade: 2, valorPorNumero: 9.9 }]));
  });
  await page.reload();

  // open cart and check total
  await page.getByRole('button', { name: /abrir carrinho/i }).click();
  await expect(page.getByText('Galinha')).toBeVisible();
  // look for total inside drawer container
  const drawer = page.locator('div.ml-auto');
  await expect(drawer.getByText('R$ 19.80').first()).toBeVisible();

  // remove item
  await page.getByRole('button', { name: /remover/i }).click();
  await expect(page.getByText('Carrinho vazio')).toBeVisible();
});