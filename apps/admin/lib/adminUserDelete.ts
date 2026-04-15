import type { DocumentReference } from 'firebase-admin/firestore';

/**
 * Delete a document and all nested subcollections (Firestore has no cascade).
 */
export async function deleteDocumentTree(docRef: DocumentReference): Promise<void> {
  const cols = await docRef.listCollections();
  for (const col of cols) {
    const snap = await col.get();
    for (const d of snap.docs) {
      await deleteDocumentTree(d.ref);
    }
  }
  await docRef.delete();
}

export function normalizeUsernameHandle(username: string): string {
  return username.trim().toLowerCase();
}
