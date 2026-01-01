import { adminDb } from "@/lib/firestoreAdmin";

export async function writeAudit(event: string, payload: any) {
  try {
    const doc = await adminDb.collection('logs_audit').add({ event, payload, timestamp: new Date().toISOString() });
    return { id: doc.id };
  } catch (e) {
    console.warn('audit write error', e);
    return null;
  }
}
