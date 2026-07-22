import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { deleteOdysseyAccountData } from '@/lib/account-deletion';
import { db } from '@/lib/pg';

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Account storage is not configured' }, { status: 503 });
  }

  try {
    await deleteOdysseyAccountData(db, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account data deletion error:', error);
    return NextResponse.json({ error: 'Account data could not be deleted' }, { status: 500 });
  }
}
