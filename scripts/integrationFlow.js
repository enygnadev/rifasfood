const fetch = require('node-fetch');
(async function() {
  const base = process.env.APP_URL || 'http://localhost:3000';
  console.log('Using base URL:', base);

  // 1) Create a rifa (admin) - requires ADMIN_SECRET in env
  let res = await fetch(base + '/api/admin/criar-rifa', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': process.env.ADMIN_SECRET || '' },
    body: JSON.stringify({ nome: '🧪 Rifa Teste', meta: 10, valor: 10 })
  });
  const created = await res.json();
  if (!created.id) return console.error('Failed to create rifa', created);
  console.log('Created rifa', created.id);

  // 2) Create a purchase
  res = await fetch(base + '/api/comprar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rifaId: created.id, userId: 'test-user' }) });
  const purchase = await res.json();
  console.log('Purchase created:', purchase);
  if (!purchase.purchaseId) return console.error('Purchase failed');

  // 3) Simulate webhook (dev)
  res = await fetch(base + '/api/debug/simulate-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purchaseId: purchase.purchaseId }) });
  const sim = await res.json();
  console.log('Simulate webhook result:', sim);

  // 4) Check rifa
  res = await fetch(base + `/api/admin/run-sorteio`, { method: 'POST', headers: { 'x-admin-secret': process.env.ADMIN_SECRET || '' } });
  const run = await res.json();
  console.log('Run sorteio (manual):', run);
})();
