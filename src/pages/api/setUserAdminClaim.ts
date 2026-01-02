// Next.js API route to chamar a Cloud Function setUserAdminClaim
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { uid, admin } = req.body;
  if (!uid || typeof admin !== 'boolean') return res.status(400).json({ error: 'Parâmetros inválidos' });

  try {
    // Chama a função HTTPS do Firebase Functions
    const response = await fetch(
      process.env.FIREBASE_FUNCTIONS_URL + '/setUserAdminClaim',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { uid, admin } })
      }
    );
    if (!response.ok) throw new Error('Erro ao chamar função');
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'Erro na função');
    return res.status(200).json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
