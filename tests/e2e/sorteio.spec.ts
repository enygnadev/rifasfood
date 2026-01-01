import { test, expect } from '@playwright/test';

test('sorteio page shows winner and confetti canvas after force-run', async ({ request, page }) => {
  const adminSecret = process.env.ADMIN_SECRET || 'change_me';
  // create rifa
  const createRes = await request.post('/api/admin/criar-rifa', { headers: { 'x-admin-secret': adminSecret }, data: { nome: 'E2E Sorteio Test', meta: 1, valor: 10 } });
  expect(createRes.ok()).toBeTruthy();
  const createJson = await createRes.json();
  const rifaId = createJson.id as string;

  // create a purchase directly (simulate paid purchase by creating compra and marking paid)
  const buyRes = await request.post('/api/comprar', { data: { rifaId, userId: 'e2e-user' } });
  expect(buyRes.ok()).toBeTruthy();
  const buyJson = await buyRes.json();
  const purchaseId = buyJson.purchaseId;

  // simulate webhook to mark purchase as paid
  const sim = await request.post('/api/debug/simulate-webhook', { data: { purchaseId } });
  expect(sim.ok()).toBeTruthy();

  // force run
  const forceRes = await request.post('/api/admin/force-run', { headers: { 'x-admin-secret': adminSecret }, data: { rifaId } });
  expect(forceRes.ok()).toBeTruthy();

  // open sorteio page in browser and check for winner text and confetti canvas
  await page.goto(`/sorteio?rifa=${rifaId}`);
  await page.waitForTimeout(1000);
  const winner = page.locator('text=Vencedor:').first();
  await expect(winner).toBeVisible();
  const confetti = page.locator('#confetti-canvas');
  await expect(confetti).toBeVisible();
});