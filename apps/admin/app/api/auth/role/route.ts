import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebaseAdmin';

const USERS_COLLECTION = 'users';
const ADMIN_ROLES = ['admin', 'superadmin'];

export type RoleResponse = { role: string } | { error: string };

/**
 * POST body: { idToken: string }
 * Returns { role: 'admin' | 'superadmin' } if allowed, or { error: string }.
 * Uses Firebase Admin SDK so the read bypasses client Firestore rules.
 */
export async function POST(request: NextRequest): Promise<NextResponse<RoleResponse>> {
  try {
    const body = await request.json();
    const idToken = typeof body?.idToken === 'string' ? body.idToken : null;
    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const firestore = getAdminFirestore();
    const snap = await firestore.collection(USERS_COLLECTION).doc(uid).get();
    if (!snap.exists) {
      return NextResponse.json({ role: '' });
    }

    const raw = snap.data()?.role;
    const role = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    const allowed = ADMIN_ROLES.includes(role) ? role : '';
    return NextResponse.json({ role: allowed });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('[API /api/auth/role]', e);
    }
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
