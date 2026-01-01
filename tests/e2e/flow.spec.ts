import { test, expect } from '@playwright/test';

test('integration flow: create rifa -> comprar -> simulate webhook -> run sorteio', async ({ request }) => {
  const adminSecret = process.env.ADMIN_SECRET || '';
  // 1) create rifa
  const createRes = await request.post('/api/admin/criar-rifa', {
    headers: { 'x-admin-secret': adminSecret || 'change_me' },
    data: { nome: 'E2E Rifa Test', meta: 5, valor: 10 }
  });
  if (!createRes.ok()) {
    const txt = await createRes.text();
    console.error('create failed', createRes.status(), txt);
  }
  expect(createRes.ok()).toBeTruthy();
  const createJson = await createRes.json();
  expect(createJson.id).toBeTruthy();
  const rifaId = createJson.id as string;

  // 2) comprar
  const buyRes = await request.post('/api/comprar', { data: { rifaId, userId: 'e2e-user' } });
  expect(buyRes.ok()).toBeTruthy();
  const buyJson = await buyRes.json();
  expect(buyJson.purchaseId).toBeTruthy();
  const purchaseId = buyJson.purchaseId as string;

  // 3) simulate webhook (dev-only)
  const simRes = await request.post('/api/debug/simulate-webhook', { data: { purchaseId } });
  expect(simRes.ok()).toBeTruthy();
  const simJson = await simRes.json();
  expect(simJson.ok).toBeTruthy();

  // 4) force run sorteio for the created rifa (admin)
  const forceRes = await request.post('/api/admin/force-run', { headers: { 'x-admin-secret': adminSecret || 'change_me' }, data: { rifaId } });
  expect(forceRes.ok()).toBeTruthy();
  const forceJson = await forceRes.json();
  expect(forceJson).toHaveProperty('result');

  // 5) Visit the public /sorteio page and check winner if present
  const page = await request.get(`/sorteio?rifa=${rifaId}`);
  expect(page.ok()).toBeTruthy();
});
