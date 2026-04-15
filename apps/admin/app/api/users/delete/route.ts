import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebaseAdmin';
import { deleteDocumentTree, normalizeUsernameHandle } from '@/lib/adminUserDelete';

const USERS_COLLECTION = 'users';
const HANDLES_COLLECTION = 'handles';
const ADMIN_ROLES = ['admin', 'superadmin'];

type Body = { idToken?: string; targetUid?: string };

/**
 * POST { idToken, targetUid }
 * Deletes Firestore users/{targetUid} (full subtree), reserved handle if owned, then Firebase Auth user.
 * Caller must be admin or superadmin; cannot delete their own account.
 */
export async function POST(request: NextRequest): Promise<NextResponse<{ ok?: true } | { error: string }>> {
  try {
    const body = (await request.json()) as Body;
    const idToken = typeof body.idToken === 'string' ? body.idToken : null;
    const targetUid = typeof body.targetUid === 'string' ? body.targetUid.trim() : null;
    if (!idToken || !targetUid) {
      return NextResponse.json({ error: 'Missing idToken or targetUid' }, { status: 400 });
    }

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const callerUid = decoded.uid;
    if (callerUid === targetUid) {
      return NextResponse.json({ error: 'You cannot delete your own account from here.' }, { status: 403 });
    }

    const firestore = getAdminFirestore();
    const callerSnap = await firestore.collection(USERS_COLLECTION).doc(callerUid).get();
    const callerRoleRaw = callerSnap.data()?.role;
    const callerRole =
      typeof callerRoleRaw === 'string' ? callerRoleRaw.trim().toLowerCase() : '';
    if (!ADMIN_ROLES.includes(callerRole)) {
      return NextResponse.json({ error: 'Admin or superadmin role required.' }, { status: 403 });
    }

    const userRef = firestore.collection(USERS_COLLECTION).doc(targetUid);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      const username = userSnap.data()?.username;
      if (typeof username === 'string' && username.trim()) {
        const norm = normalizeUsernameHandle(username);
        if (norm) {
          const handleRef = firestore.collection(HANDLES_COLLECTION).doc(norm);
          const handleSnap = await handleRef.get();
          if (handleSnap.exists && handleSnap.data()?.uid === targetUid) {
            await handleRef.delete();
          }
        }
      }
      await deleteDocumentTree(userRef);
    }

    try {
      await auth.deleteUser(targetUid);
    } catch (e: unknown) {
      const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : '';
      if (code === 'auth/user-not-found') {
        // Firestore (and handle) may already be gone; treat as success
      } else {
        throw e;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('[API /api/users/delete]', e);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
